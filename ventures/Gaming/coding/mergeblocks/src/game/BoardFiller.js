// ============================================================
// BoardFiller — 初始棋盘生成 & 补块 & 死局保底
// ============================================================

import { BOARD_WIDTH, BOARD_HEIGHT, MIN_STARTING_GROUPS, MAX_STARTING_TILE, MAX_REROLL_ATTEMPTS } from './config.js';
import { Tile } from './Tile.js';
import { MergeEngine } from './MergeEngine.js';

export class BoardFiller {
  static generateInitial(board, getTileWeights) {
    const values = [2, 2, 2, 2, 4, 4, 8];
    const cells = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        cells.push({ row: r, col: c });
      }
    }
    this._shuffle(cells);
    for (let i = 0; i < cells.length; i++) {
      const val = i < values.length
        ? values[i % values.length]
        : this._weightedRandom(getTileWeights(MAX_STARTING_TILE));
      const tile = new Tile(val, cells[i].row, cells[i].col);
      board.set(cells[i].row, cells[i].col, tile);
    }

    let attempts = 0;
    while (attempts < 20) {
      const groups = MergeEngine.findAllGroups(board);
      if (groups.length >= MIN_STARTING_GROUPS && board.getMaxTileValue() <= MAX_STARTING_TILE) {
        return;
      }
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) board.clear(r, c);
      }
      this._shuffle(cells);
      for (let i = 0; i < cells.length; i++) {
        const val = i < values.length
          ? values[i % values.length]
          : this._weightedRandom(getTileWeights(MAX_STARTING_TILE));
        const tile = new Tile(val, cells[i].row, cells[i].col);
        board.set(cells[i].row, cells[i].col, tile);
      }
      attempts++;
    }
  }

  /**
   * 合并后执行补块流程：下落 → 顶部补齐
   * @returns {{ movements: Array<{tile, fromRow, toRow, col}>, newTiles: Array<Tile> }}
   */
  static fillAfterMerge(board, getTileWeights) {
    const movements = [];
    const newTiles = [];

    // 按列下落
    for (let c = 0; c < BOARD_WIDTH; c++) {
      // 收集本列存在的 tile（包含原 row 信息）
      const column = [];
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        const tile = board.get(r, c);
        if (tile) column.push({ tile, originalRow: r });
      }
      // 清空本列
      for (let r = 0; r < BOARD_HEIGHT; r++) board.clear(r, c);
      // 从下往上放置
      let targetRow = BOARD_HEIGHT - 1;
      for (let i = column.length - 1; i >= 0; i--) {
        const { tile, originalRow } = column[i];
        if (originalRow !== targetRow) {
          movements.push({
            tile,
            fromRow: originalRow,
            toRow: targetRow,
            col: c,
          });
        }
        tile.row = targetRow;
        tile.col = c;
        board.set(targetRow, c, tile);
        targetRow--;
      }
    }

    // 顶部补齐空位
    const maxTile = board.getMaxTileValue();
    const weights = getTileWeights(maxTile);

    for (let c = 0; c < BOARD_WIDTH; c++) {
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (!board.get(r, c)) {
          const val = this._weightedRandom(weights);
          const tile = new Tile(val, r, c);
          tile.isNew = true;
          board.set(r, c, tile);
          newTiles.push(tile);
        }
      }
    }

    return { movements, newTiles };
  }

  static deadlockRecovery(board, getTileWeights, newTiles) {
    for (let attempt = 0; attempt < MAX_REROLL_ATTEMPTS; attempt++) {
      const maxTile = board.getMaxTileValue();
      const weights = getTileWeights(maxTile);
      for (const tile of newTiles) {
        tile.value = this._weightedRandom(weights);
      }
      if (MergeEngine.hasAnyMergeableGroup(board)) return true;
    }
    return false;
  }

  static _weightedRandom({ values, weights }) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < values.length; i++) {
      r -= weights[i];
      if (r <= 0) return values[i];
    }
    return values[values.length - 1];
  }

  static _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
