// ============================================================
// MergeEngine — BFS 八方向连通检测 + 合并执行
// ============================================================

import { BOARD_WIDTH, BOARD_HEIGHT, MIN_MERGE_GROUP } from './config.js';

/** 八方向偏移 */
const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export class MergeEngine {
  /**
   * BFS 搜索与 (row, col) 同值的连通组
   * @returns {Array<{row:number, col:number}> | null} 组内格子列表，不足 2 返回 null
   */
  static findConnectedGroup(board, row, col) {
    const tile = board.get(row, col);
    if (!tile) return null;

    const targetValue = tile.value;
    const visited = new Set();
    const queue = [{ row, col }];
    const group = [];

    visited.add(`${row},${col}`);

    while (queue.length > 0) {
      const cur = queue.shift();
      group.push(cur);

      for (const [dr, dc] of DIRS) {
        const nr = cur.row + dr;
        const nc = cur.col + dc;
        const key = `${nr},${nc}`;
        if (!board.inBounds(nr, nc)) continue;
        if (visited.has(key)) continue;
        const neighbor = board.get(nr, nc);
        if (neighbor && neighbor.value === targetValue) {
          visited.add(key);
          queue.push({ row: nr, col: nc });
        }
      }
    }

    return group.length >= MIN_MERGE_GROUP ? group : null;
  }

  /**
   * 执行合并
   * @param {Board} board - 棋盘（会被修改）
   * @param {Array} group - 连通组格子列表
   * @param {number} targetRow - 合并落点行
   * @param {number} targetCol - 合并落点列
   * @param {Function} getBonusRank - bonusRank 计算函数
   * @param {Function} getScoreMultiplier - 分数倍率计算函数
   * @returns {{ resultValue: number, cleared: number, baseRank: number, bonusRank: number, score: number }}
   */
  static executeMerge(board, group, targetRow, targetCol, getBonusRank, getScoreMultiplier) {
    const clickedTile = board.get(targetRow, targetCol);
    if (!clickedTile) return null;

    const baseRank = clickedTile.rank;
    const groupSize = group.length;
    const bonusRank = getBonusRank(groupSize);
    const resultRank = baseRank + 1 + bonusRank;
    const resultValue = Math.pow(2, resultRank);

    // 清除组内所有格子（除落点外）
    let cleared = 0;
    for (const cell of group) {
      if (cell.row !== targetRow || cell.col !== targetCol) {
        board.clear(cell.row, cell.col);
        cleared++;
      }
    }

    // 落点升级
    const newTile = board.get(targetRow, targetCol);
    newTile.value = resultValue;

    // 计算分数
    const scoreMultiplier = getScoreMultiplier(groupSize);
    const score = resultValue * scoreMultiplier;

    return { resultValue, cleared, baseRank, bonusRank, score, groupSize };
  }

  /**
   * 检查整个棋盘是否存在任何可合并组
   * @returns {boolean}
   */
  static hasAnyMergeableGroup(board) {
    const visited = new Set();

    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const tile = board.get(r, c);
        if (!tile) continue;
        const key = `${r},${c}`;
        if (visited.has(key)) continue;

        // 检查邻居是否有同值
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (!board.inBounds(nr, nc)) continue;
          const neighbor = board.get(nr, nc);
          if (neighbor && neighbor.value === tile.value) {
            return true;
          }
        }
        visited.add(key);
      }
    }
    return false;
  }

  /**
   * 获取所有可合并组（按大小降序）
   * @returns {Array<{group: Array, size: number, value: number}>}
   */
  static findAllGroups(board) {
    const visited = new Set();
    const groups = [];

    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const tile = board.get(r, c);
        if (!tile) continue;
        const key = `${r},${c}`;
        if (visited.has(key)) continue;

        const group = this.findConnectedGroup(board, r, c);
        if (group) {
          for (const cell of group) visited.add(`${cell.row},${cell.col}`);
          groups.push({ group, size: group.length, value: tile.value });
        }
      }
    }
    groups.sort((a, b) => b.size - a.size);
    return groups;
  }
}
