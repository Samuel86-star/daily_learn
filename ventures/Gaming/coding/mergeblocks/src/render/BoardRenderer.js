// ============================================================
// BoardRenderer — 棋盘背景网格（简化外框）
// ============================================================

import * as PIXI from 'pixi.js';
import { BOARD_WIDTH, BOARD_HEIGHT, COLORS } from '../game/config.js';

export class BoardRenderer {
  constructor(container, cellSize, gap) {
    this.container = container;
    this.cellSize = cellSize;
    this.gap = gap;
    this._draw();
  }

  get width() { return BOARD_WIDTH * this.cellSize + (BOARD_WIDTH + 1) * this.gap; }
  get height() { return BOARD_HEIGHT * this.cellSize + (BOARD_HEIGHT + 1) * this.gap; }

  _draw() {
    const w = this.width;
    const h = this.height;
    const g = this.gap;
    const s = this.cellSize;

    // 棋盘主背景（深紫，更柔和）
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, 18);
    bg.fill({ color: 0x1f0f42 });
    this.container.addChild(bg);

    // 格子底色（更深紫，凹陷感）
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const x = g + c * (s + g);
        const y = g + r * (s + g);
        bg.roundRect(x, y, s, s, s * 0.22);
        bg.fill({ color: 0x130828 });
      }
    }
  }

  getBoardPixelBounds() {
    return { x: 0, y: 0, width: this.width, height: this.height };
  }

  pixelToCell(localX, localY, tileRenderer) {
    const step = this.cellSize + this.gap;
    const col = Math.floor((localX - tileRenderer.offsetX + this.gap / 2) / step);
    const row = Math.floor((localY - tileRenderer.offsetY + this.gap / 2) / step);
    if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH) {
      return { row, col };
    }
    return null;
  }
}
