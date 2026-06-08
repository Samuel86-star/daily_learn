// ============================================================
// Board — 棋盘数据结构
// board[row][col] = Tile | null
// ============================================================

import { BOARD_WIDTH, BOARD_HEIGHT } from './config.js';

export class Board {
  constructor() {
    this.grid = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      this.grid[r] = new Array(BOARD_WIDTH).fill(null);
    }
  }

  get rows() { return BOARD_HEIGHT; }
  get cols() { return BOARD_WIDTH; }

  /** 获取某格 tile */
  get(row, col) {
    if (row < 0 || row >= BOARD_HEIGHT || col < 0 || col >= BOARD_WIDTH) return undefined;
    return this.grid[row][col];
  }

  /** 设置某格 tile */
  set(row, col, tile) {
    if (row < 0 || row >= BOARD_HEIGHT || col < 0 || col >= BOARD_WIDTH) return;
    this.grid[row][col] = tile;
    if (tile) {
      tile.row = row;
      tile.col = col;
    }
  }

  /** 清除某格 */
  clear(row, col) {
    this.grid[row][col] = null;
  }

  /** 是否在棋盘内 */
  inBounds(row, col) {
    return row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH;
  }

  /** 获取所有非空 tile */
  getTiles() {
    const tiles = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[r][c]) tiles.push(this.grid[r][c]);
      }
    }
    return tiles;
  }

  /** 获取所有空位 */
  getEmptyCells() {
    const cells = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (!this.grid[r][c]) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  /** 获取棋盘当前最大数字 */
  getMaxTileValue() {
    let max = 0;
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[r][c] && this.grid[r][c].value > max) {
          max = this.grid[r][c].value;
        }
      }
    }
    return max;
  }

  /** 深拷贝棋盘 */
  clone() {
    const b = new Board();
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[r][c]) {
          b.grid[r][c] = this.grid[r][c].clone();
        }
      }
    }
    return b;
  }

  /** 从快照恢复 */
  loadSnapshot(gridData) {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        this.grid[r][c] = gridData[r][c] ? gridData[r][c].clone() : null;
      }
    }
  }

  /** 序列化（用于调试/存档） */
  toJSON() {
    const data = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      data[r] = [];
      for (let c = 0; c < BOARD_WIDTH; c++) {
        data[r][c] = this.grid[r][c] ? this.grid[r][c].value : 0;
      }
    }
    return data;
  }
}
