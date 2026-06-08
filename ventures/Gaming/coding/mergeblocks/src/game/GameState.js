// ============================================================
// GameState — 中央游戏状态管理
// tap() 返回完整动画时间线供渲染层分阶段播放
// ============================================================

import { Board } from './Board.js';
import { Tile } from './Tile.js';
import { MergeEngine } from './MergeEngine.js';
import { BoardFiller } from './BoardFiller.js';
import { ComboSystem } from './ComboSystem.js';
import { ItemSystem } from './ItemSystem.js';
import { QuestSystem } from './QuestSystem.js';
import { Economy } from './Economy.js';
import { getTileWeights, getBonusRank, getScoreMultiplier, ITEM_PRICES } from './config.js';

export class GameState {
  constructor() {
    this.board = new Board();
    this.combo = new ComboSystem();
    this.quest = new QuestSystem();
    this.economy = new Economy();
    this.filler = BoardFiller;
    this.items = new ItemSystem(this.board, this.filler);

    this.score = 0;
    this.maxTile = 2;
    this.gameOver = false;
    this.gameStarted = false;
    this._victory = false;

    this.stats = this._freshStats();

    this.onStateChange = null;
    this.onMerge = null;
    this.onGameOver = null;
    this.onQuestComplete = null;
  }

  newGame() {
    this.board = new Board();
    this.combo.reset();
    this.items = new ItemSystem(this.board, this.filler);
    this.score = 0;
    this.maxTile = 2;
    this.gameOver = false;
    this.gameStarted = true;
    this._victory = false;
    this.stats = this._freshStats();

    this.filler.generateInitial(this.board, getTileWeights);
    this.maxTile = this.board.getMaxTileValue();

    this.quest.newGame();
    this._notify();
  }

  /**
   * 点击合并 — 返回完整动画时间线
   * @returns {null | {
   *   group: Array<{row, col, tileId, value}>,
   *   targetRow, targetCol,
   *   absorbedTileIds: number[],     // 被吸入的 tile id（升级后将消失）
   *   upgradedTileId: number,         // 落点 tile id
   *   resultValue: number,            // 升级后的值
   *   groupSize: number,
   *   finalScore: number,
   *   comboCount: number, comboMult: number,
   *   movements: Array<{tileId, fromRow, toRow, col}>,
   *   newTiles: Array<{tileId, row, col, value}>,
   *   completedQuests: Array<Quest>,
   *   gameOver: boolean,
   * }}
   */
  tap(row, col) {
    if (this.gameOver) return null;
    const tile = this.board.get(row, col);
    if (!tile) return null;

    const group = MergeEngine.findConnectedGroup(this.board, row, col);
    if (!group) return null;

    // ---- 捕获合并前的组信息（含 tile id 和值，用于动画起点） ----
    const groupSnapshot = group.map(cell => {
      const t = this.board.get(cell.row, cell.col);
      return { row: cell.row, col: cell.col, tileId: t.id, value: t.value };
    });
    const absorbedTileIds = groupSnapshot
      .filter(g => !(g.row === row && g.col === col))
      .map(g => g.tileId);
    const upgradedTileId = this.board.get(row, col).id;

    // ---- 保存快照 + 执行合并 ----
    this.items.saveSnapshot(this.score, this.combo.getSnapshot(), this.maxTile);
    const result = MergeEngine.executeMerge(
      this.board, group, row, col,
      getBonusRank, getScoreMultiplier
    );

    this.combo.recordMerge();
    const comboMult = this.combo.currentMultiplier;
    const finalScore = Math.floor(result.score * comboMult);
    this.score += finalScore;
    this.maxTile = Math.max(this.maxTile, result.resultValue);

    const gs = result.groupSize;
    if (gs >= 4) this.stats.bigMergeCount4++;
    if (gs >= 6) this.stats.bigMergeCount6++;
    this.stats.totalMerges++;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo.count);

    // ---- 补块（含动作记录） ----
    const { movements, newTiles } = this.filler.fillAfterMerge(this.board, getTileWeights);

    // ---- 死局检测 ----
    let gameOverNow = false;
    if (!MergeEngine.hasAnyMergeableGroup(this.board)) {
      const recovered = this.filler.deadlockRecovery(this.board, getTileWeights, newTiles);
      if (!recovered) {
        this.gameOver = true;
        gameOverNow = true;
      }
    }

    // ---- 任务（捕获新完成的） ----
    const completedBefore = new Set(this.quest.completedIds);
    this._updateQuests();
    const completedQuests = this.quest.getActiveWithStatus()
      .filter(q => q.completed && !completedBefore.has(q.id));

    const timeline = {
      group: groupSnapshot,
      targetRow: row,
      targetCol: col,
      absorbedTileIds,
      upgradedTileId,
      resultValue: result.resultValue,
      groupSize: result.groupSize,
      finalScore,
      comboCount: this.combo.count,
      comboMult,
      movements: movements.map(m => ({
        tileId: m.tile.id, fromRow: m.fromRow, toRow: m.toRow, col: m.col,
      })),
      newTiles: newTiles.map(t => ({
        tileId: t.id, row: t.row, col: t.col, value: t.value,
      })),
      completedQuests,
      gameOver: gameOverNow,
    };

    this._notify();
    return timeline;
  }

  /** 道具使用（同步，无动画时间线） */
  useItem(type, ...args) {
    if (this.gameOver) return null;
    let result = null;
    switch (type) {
      case 'undo':
        result = this.items.undo(this.score, this.combo, this.maxTile);
        if (result && result.score !== undefined) {
          this.score = result.score;
          this.combo.count = result.combo;
          this.maxTile = result.maxTile;
          this.gameOver = false;
          this._updateQuests();
          this._notify();
        }
        break;
      case 'hammer':
        result = this.items.hammer(args[0], args[1], getTileWeights);
        if (result && result.used) {
          this.combo.clearByItem();
          this.maxTile = this.board.getMaxTileValue();
          this._checkDeadlock();
          this._updateQuests();
          this._notify();
        }
        break;
      case 'shuffle':
        result = this.items.shuffle(getTileWeights);
        if (result && result.used) {
          this.combo.clearByItem();
          this.stats.shuffleUsed = true;
          this._checkDeadlock();
          this._updateQuests();
          this._notify();
        }
        break;
    }
    return result;
  }

  purchaseItem(type) {
    const price = ITEM_PRICES[type];
    if (!price) return false;
    if (this.economy.spendCoins(price)) {
      this.items.freeUses[type]++;
      this._notify();
      return true;
    }
    return false;
  }

  getResult() {
    return {
      score: this.score,
      maxTile: this.maxTile,
      combo: this.combo.count,
      maxCombo: this.stats.maxCombo,
      bigMergeCount4: this.stats.bigMergeCount4,
      bigMergeCount6: this.stats.bigMergeCount6,
      totalMerges: this.stats.totalMerges,
      completedQuests: this.quest.getActiveWithStatus().filter(q => q.completed).length,
      victory: this._victory,
      coins: this.economy.calculateGameReward({ maxTile: this.maxTile, score: this.score }),
    };
  }

  collectReward() {
    const reward = this.economy.calculateGameReward({ maxTile: this.maxTile, score: this.score });
    this.economy.addCoins(reward);
    return reward;
  }

  _checkDeadlock() {
    if (!MergeEngine.hasAnyMergeableGroup(this.board)) {
      this.gameOver = true;
      if (this.onGameOver) this.onGameOver(this.getResult());
    } else {
      this.gameOver = false;
    }
  }

  _updateQuests() {
    const stats = { ...this.stats, maxTile: this.maxTile, score: this.score, maxCombo: this.stats.maxCombo };
    this.quest.update(stats, {
      onComplete: (quest) => {
        this.economy.addCoins(quest.reward);
        if (this.onQuestComplete) this.onQuestComplete(quest);
      },
    });
    // 3 个任务全完成 → 本局胜利
    const allActive = this.quest.getActiveWithStatus();
    if (allActive.length === 3 && allActive.every(q => q.completed)) {
      this.gameOver = true;
      this._victory = true;
    } else {
      this.quest.fillQuests();
    }
  }

  _notify() { if (this.onStateChange) this.onStateChange(this); }

  _freshStats() {
    return {
      maxTile: 2, score: 0,
      bigMergeCount4: 0, bigMergeCount6: 0, totalMerges: 0,
      maxCombo: 0, shuffleUsed: false, mergesAfterShuffle: 0,
    };
  }
}
