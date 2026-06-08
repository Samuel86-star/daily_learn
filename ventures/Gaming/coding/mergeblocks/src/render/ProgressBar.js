// ============================================================
// ProgressBar — 顶部里程碑色条（Pro Max 呼吸动画版）
// ============================================================

import * as PIXI from 'pixi.js';
import { getTileColor } from '../game/config.js';

const MILESTONES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

export class ProgressBar {
  constructor(container, designWidth, y) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.designWidth = designWidth;
    this.y = y;
    this._chips = [];
    this._lastMaxTile = 2;
    this._build();
    this._startBreathing();
  }

  _build() {
    const lw = this.designWidth;
    const visibleCount = 7;
    const chipSize = 32;
    const gap = 4;
    const totalW = visibleCount * chipSize + (visibleCount - 1) * gap;
    const startX = (lw - totalW) / 2;

    // 背景色条
    const trackBg = new PIXI.Graphics();
    trackBg.roundRect(startX - 6, this.y + chipSize + 6, totalW + 12, 6, 3);
    trackBg.fill({ color: 0x1a0d3a, alpha: 0.8 });
    this.container.addChild(trackBg);

    // 进度条填充
    const trackFill = new PIXI.Graphics();
    this.container.addChild(trackFill);
    this._trackFill = trackFill;
    this._trackStartX = startX - 6;
    this._trackY = this.y + chipSize + 6;
    this._trackMaxW = totalW + 12;

    // 里程碑小方块
    for (let i = 0; i < visibleCount; i++) {
      const x = startX + i * (chipSize + gap);
      const chip = this._createChip(MILESTONES[i], x, this.y, chipSize);
      this.container.addChild(chip);
      this._chips.push({ value: MILESTONES[i], container: chip, x, y: this.y, size: chipSize });
    }
  }

  _createChip(value, x, y, size) {
    const container = new PIXI.Container();
    container.x = x; container.y = y;

    const palette = getTileColor(value);

    const shadow = new PIXI.Graphics();
    shadow.roundRect(1, 2, size, size, size * 0.22);
    shadow.fill({ color: 0x000000, alpha: 0.3 });
    container.addChild(shadow);

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, size, size, size * 0.22);
    bg.fill({ color: palette.bg });
    container.addChild(bg);

    const hi = new PIXI.Graphics();
    hi.roundRect(2, 2, size - 4, size * 0.45, size * 0.18);
    hi.fill({ color: palette.hi, alpha: 0.55 });
    container.addChild(hi);

    const text = new PIXI.Text({
      text: value.toString(),
      style: {
        fontFamily: 'Arial Black, sans-serif',
        fontWeight: '900',
        fontSize: value >= 1000 ? size * 0.32 : value >= 100 ? size * 0.38 : size * 0.5,
        fill: palette.text,
        stroke: { color: palette.text === 0xffffff ? 0x000000 : 0xffffff, width: 2, alpha: 0.4 },
      },
    });
    text.anchor.set(0.5, 0.5);
    text.x = size / 2;
    text.y = size / 2;
    container.addChild(text);

    container._bg = bg;
    container._hi = hi;
    container._text = text;
    container._shadow = shadow;
    return container;
  }

  update(maxTile) {
    let lastReachedIdx = -1;
    let currentIdx = -1;
    for (let i = 0; i < this._chips.length; i++) {
      const chip = this._chips[i];
      const reached = maxTile >= chip.value;
      const isCurrent = chip.value === maxTile;
      if (reached) lastReachedIdx = i;
      if (isCurrent) currentIdx = i;

      if (!reached) {
        chip.container._bg.tint = 0x4a3a6a;
        chip.container._hi.tint = 0x6a5a8a;
        chip.container.alpha = 0.45;
        chip.container.scale.set(1);
        chip.container._isCurrent = false;
      } else {
        chip.container._bg.tint = 0xffffff;
        chip.container._hi.tint = 0xffffff;
        chip.container.alpha = 1.0;
        chip.container.scale.set(isCurrent ? 1.15 : 1);
        chip.container._isCurrent = isCurrent;
      }
    }

    this._trackFill.clear();
    if (lastReachedIdx >= 0) {
      const progress = (lastReachedIdx + 1) / this._chips.length;
      const fillW = this._trackMaxW * progress;
      const grad = new PIXI.FillGradient({
        type: 'linear',
        start: { x: 0, y: 0 }, end: { x: fillW, y: 0 },
        colorStops: [
          { offset: 0, color: 0xee5a8a },
          { offset: 0.3, color: 0xa855f7 },
          { offset: 0.6, color: 0x4f7df5 },
          { offset: 1, color: 0x26a69a },
        ],
        textureSpace: 'global',
      });
      this._trackFill.roundRect(this._trackStartX, this._trackY, fillW, 6, 3);
      this._trackFill.fill(grad);
    }

    this._lastMaxTile = maxTile;
  }

  _startBreathing() {
    const tick = () => {
      const t = performance.now() / 1000;
      for (const chip of this._chips) {
        if (chip.container._isCurrent) {
          const breath = 1.12 + 0.06 * Math.sin(t * 2.5);
          chip.container.scale.set(breath);
        }
      }
      this._breathFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  destroy() {
    if (this._breathFrame) cancelAnimationFrame(this._breathFrame);
    this.container.destroy({ children: true });
  }
}
