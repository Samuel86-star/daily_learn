// ============================================================
// Tile — 棋盘中的单个数字块
// ============================================================

export class Tile {
  /**
   * @param {number} value - 2 的幂次数值
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  constructor(value, row, col) {
    this.value = value;
    this.row = row;
    this.col = col;
    this.id = Tile._nextId++;
    /** 补块动画用：新生成的 tile 标记 */
    this.isNew = false;
  }

  get rank() {
    return Math.log2(this.value);
  }

  clone() {
    const t = new Tile(this.value, this.row, this.col);
    t.id = this.id;
    t.isNew = this.isNew;
    return t;
  }

  static _nextId = 0;
}
