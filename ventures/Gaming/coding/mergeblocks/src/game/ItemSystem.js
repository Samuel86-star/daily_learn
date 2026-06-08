// ============================================================
// ItemSystem — 道具管理（撤销/单格清除/重洗）
// ============================================================

import { Board } from './Board.js';
import { Tile } from './Tile.js';
import { MergeEngine } from './MergeEngine.js';
import { BOARD_WIDTH, BOARD_HEIGHT, FREE_ITEMS_PER_GAME, ITEM_PRICES } from './config.js';

export class ItemSystem {
  constructor(board, filler) {
    this.board = board;
    this.filler = filler;
    this._snapshot = null;
    this._snapshotScore = 0;
    this._snapshotCombo = null;
    this._snapshotMaxTile = 0;
    this.freeUses = { ...FREE_ITEMS_PER_GAME };
    this.getTileWeights = null; // 由外部注入
  }

  resetGame() {
    this._snapshot = null;
    this._snapshotScore = 0;
    this._snapshotCombo = null;
    this._snapshotMaxTile = 0;
    this.freeUses = { ...FREE_ITEMS_PER_GAME };
  }

  /** 保存合并前快照 */
  saveSnapshot(score, comboSnap, maxTile) {
    this._snapshot = this.board.clone();
    this._snapshotScore = score;
    this._snapshotCombo = comboSnap ? { ...comboSnap } : null;
    this._snapshotMaxTile = maxTile;
  }

  /** 撤销 */
  undo(score, combo, maxTile) {
    if (!this._snapshot) return null;
    if (this.freeUses.undo <= 0) return { needCoin: true, price: ITEM_PRICES.undo };

    this.freeUses.undo--;
    this.board.loadSnapshot(this._snapshot.grid);

    return {
      score: this._snapshotScore,
      combo: this._snapshotCombo ? this._snapshotCombo.count : 0,
      maxTile: this._snapshotMaxTile,
      used: 'undo',
    };
  }

  /** 单格清除 */
  hammer(row, col, getTileWeightsFn) {
    if (this.freeUses.hammer <= 0) return { needCoin: true, price: ITEM_PRICES.hammer };
    const tile = this.board.get(row, col);
    if (!tile) return null;
    if (tile.value === this.board.getMaxTileValue() &&
        this.board.getTiles().filter(t => t.value === tile.value).length <= 1) {
      return null;
    }
    this.freeUses.hammer--;
    this.board.clear(row, col);
    const newTiles = this.filler.fillAfterMerge(this.board, getTileWeightsFn);
    return { row, col, newTiles, used: 'hammer' };
  }

  /** 重洗 */
  shuffle(getTileWeightsFn) {
    if (this.freeUses.shuffle <= 0) return { needCoin: true, price: ITEM_PRICES.shuffle };
    this.freeUses.shuffle--;

    const values = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const tile = this.board.get(r, c);
        if (tile) values.push(tile.value);
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      this._shuffle(values);
      const newBoard = new Board();
      let idx = 0;
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
          if (idx < values.length) {
            const t = new Tile(values[idx], r, c);
            newBoard.set(r, c, t);
          }
          idx++;
        }
      }
      if (MergeEngine.hasAnyMergeableGroup(newBoard)) {
        this.board.loadSnapshot(newBoard.grid);
        return { used: 'shuffle' };
      }
    }
    return { used: 'shuffle' };
  }

  /** 用金币购买一次道具使用 */
  purchase(type, coins) {
    const price = ITEM_PRICES[type];
    if (coins < price) return false;
    this.freeUses[type]++;
    return true;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
