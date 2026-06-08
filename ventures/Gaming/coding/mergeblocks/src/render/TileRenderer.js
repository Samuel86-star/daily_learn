// ============================================================
// TileRenderer — 数字块（糖果色 + 3D 浮雕 + 描边字）
// 增强：可合并组脉冲提示
// ============================================================

import * as PIXI from 'pixi.js';
import { getTileColor, COLORS } from '../game/config.js';
// 注意：MergeEngine 不可从 config 导入，从外部传入
import { BOARD_WIDTH, BOARD_HEIGHT } from '../game/config.js';

export class TileRenderer {
  constructor(container, cellSize, gap) {
    this.container = container;
    this.cellSize = cellSize;
    this.gap = gap;
    this._pool = new Map();
    this._pulseTimer = null;
  }

  get offsetX() { return this.gap; }
  get offsetY() { return this.gap; }

  getTilePos(row, col) {
    return {
      x: this.offsetX + col * (this.cellSize + this.gap) + this.cellSize / 2,
      y: this.offsetY + row * (this.cellSize + this.gap) + this.cellSize / 2,
    };
  }

  renderBoard(board, mergeEngine) {
    const activeIds = new Set();
    const tiles = board.getTiles();
    for (const tile of tiles) {
      activeIds.add(tile.id);
      if (!this._pool.has(tile.id)) {
        this._pool.set(tile.id, this._createTileSprite());
      }
      const sprite = this._pool.get(tile.id);
      this._updateTileSprite(sprite, tile);
      sprite.visible = true;
      if (!sprite.parent) this.container.addChild(sprite);
    }
    for (const [id, sprite] of this._pool) {
      if (!activeIds.has(id)) {
        this.container.removeChild(sprite);
        this._pool.delete(id);
      }
    }
  }

  /**
   * 启动"可合并组"脉冲提示（仅棋盘空闲时有效）
   * @param {Function} findGroupsFn - () => groups 回调
   */
  startMergeHints(findGroupsFn) {
    // 不做自动脉冲，避免干扰玩家。保留接口
  }

  highlightGroup(group, board) {
    this.clearHighlight();
    if (!group) return;
    for (const cell of group) {
      const tile = board.get(cell.row, cell.col);
      if (tile && this._pool.has(tile.id)) {
        const sprite = this._pool.get(tile.id);
        if (sprite._ring) sprite._ring.visible = true;
        sprite.scale.set(1.06);
      }
    }
  }

  clearHighlight() {
    for (const [, sprite] of this._pool) {
      if (sprite._ring) sprite._ring.visible = false;
      sprite.scale.set(1);
    }
  }

  getTileSprite(tileId) {
    return this._pool.get(tileId) || null;
  }

  _createTileSprite() {
    const size = this.cellSize;
    const container = new PIXI.Container();

    // 阴影
    const shadow = new PIXI.Graphics();
    container.addChild(shadow);

    // 主背景
    const bg = new PIXI.Graphics();
    container.addChild(bg);

    // 顶部高光带
    const highlight = new PIXI.Graphics();
    container.addChild(highlight);

    // 底部微光（增加立体感）
    const bottomGlow = new PIXI.Graphics();
    container.addChild(bottomGlow);

    // 选中环
    const ring = new PIXI.Graphics();
    ring.visible = false;
    container.addChild(ring);

    // 数字
    const text = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'Arial Black, Helvetica, sans-serif',
        fontWeight: '900',
        fontSize: size * 0.42,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3, alpha: 0.35 },
        align: 'center',
      },
    });
    text.anchor.set(0.5, 0.5);
    container.addChild(text);

    container._shadow = shadow;
    container._bg = bg;
    container._highlight = highlight;
    container._bottomGlow = bottomGlow;
    container._ring = ring;
    container._text = text;

    return container;
  }

  _updateTileSprite(container, tile) {
    const size = this.cellSize;
    const pos = this.getTilePos(tile.row, tile.col);
    container.x = pos.x;
    container.y = pos.y;

    const palette = getTileColor(tile.value);
    const radius = size * 0.22;
    const half = size / 2;

    // 阴影
    const shadow = container._shadow;
    shadow.clear();
    shadow.roundRect(-half + 2, -half + 4, size, size, radius);
    shadow.fill({ color: 0x000000, alpha: 0.35 });

    // 主背景
    const bg = container._bg;
    bg.clear();
    bg.roundRect(-half, -half, size, size, radius);
    bg.fill({ color: palette.bg });

    // 顶部高光带
    const hi = container._highlight;
    hi.clear();
    hi.roundRect(-half + 2, -half + 2, size - 4, size * 0.45, radius - 2);
    hi.fill({ color: palette.hi, alpha: 0.55 });
    hi.roundRect(-half + 6, -half + 4, size - 12, size * 0.12, radius * 0.6);
    hi.fill({ color: 0xffffff, alpha: 0.25 });

    // 底部微光
    const bottomGlow = container._bottomGlow;
    bottomGlow.clear();
    bottomGlow.roundRect(-half + 4, half - size * 0.3, size - 8, size * 0.2, radius * 0.5);
    bottomGlow.fill({ color: 0xffffff, alpha: 0.08 });

    // 选中环
    const ring = container._ring;
    ring.clear();
    ring.roundRect(-half - 2, -half - 2, size + 4, size + 4, radius + 2);
    ring.stroke({ color: COLORS.highlightGlow, width: 3, alpha: 0.95 });

    // 数字
    const text = container._text;
    text.text = tile.value.toString();
    const len = tile.value.toString().length;
    let fontScale = 0.42;
    if (len >= 5) fontScale = 0.22;
    else if (len >= 4) fontScale = 0.28;
    else if (len >= 3) fontScale = 0.34;
    text.style.fontSize = size * fontScale;
    text.style.fill = palette.text;
    const strokeColor = palette.text === 0xffffff ? 0x000000 : 0xffffff;
    text.style.stroke = { color: strokeColor, width: 3, alpha: 0.4 };
  }

  destroy() {
    for (const [, sprite] of this._pool) {
      this.container.removeChild(sprite);
      sprite.destroy({ children: true });
    }
    this._pool.clear();
  }
}
