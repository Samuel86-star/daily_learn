// ============================================================
// BackgroundRenderer — 深紫渐变背景 + 动态粒子星空 + 呼吸光晕
// ============================================================

import * as PIXI from 'pixi.js';
import { COLORS } from '../game/config.js';

export class BackgroundRenderer {
  constructor(width, height) {
    this.container = new PIXI.Container();
    this.width = width;
    this.height = height;
    this._stars = [];
    this._build(width, height);
    this._startAnimation();
  }

  _build(width, height) {
    // 主渐变背景
    const bg = new PIXI.Graphics();
    const gradient = new PIXI.FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: height },
      colorStops: [
        { offset: 0, color: COLORS.backgroundDark },
        { offset: 0.5, color: COLORS.background },
        { offset: 1, color: 0x0e0625 },
      ],
      textureSpace: 'global',
    });
    bg.rect(0, 0, width, height);
    bg.fill(gradient);
    this.container.addChild(bg);

    // 棋盘区域光晕（带呼吸效果）
    const glow = new PIXI.Graphics();
    const radialGrad = new PIXI.FillGradient({
      type: 'radial',
      center: { x: width / 2, y: 400 },
      innerRadius: 0,
      outerCenter: { x: width / 2, y: 400 },
      outerRadius: width * 0.6,
      colorStops: [
        { offset: 0, color: 0x6a3eb8, alpha: 0.18 },
        { offset: 0.5, color: 0x4a2b8a, alpha: 0.08 },
        { offset: 1, color: 0x000000, alpha: 0 },
      ],
      textureSpace: 'global',
    });
    glow.rect(0, 0, width, height);
    glow.fill(radialGrad);
    this.container.addChild(glow);
    this._glow = glow;

    // 动态粒子星星
    this._starContainer = new PIXI.Container();
    this.container.addChild(this._starContainer);

    for (let i = 0; i < 35; i++) {
      const star = new PIXI.Graphics();
      const r = 0.5 + Math.random() * 2;
      star.circle(0, 0, r);
      const alpha = 0.15 + Math.random() * 0.45;
      star.fill({ color: 0xffffff, alpha });
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      this._starContainer.addChild(star);
      this._stars.push({
        graphic: star,
        baseAlpha: alpha,
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 4,
        driftY: (Math.random() - 0.5) * 4,
      });
    }
  }

  _startAnimation() {
    let startTime = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000;

      // 星星闪烁 + 漂移
      for (const s of this._stars) {
        const twinkle = 0.6 + 0.4 * Math.sin(elapsed * s.speed + s.phase);
        s.graphic.alpha = s.baseAlpha * twinkle;
        // 微小漂移
        s.graphic.x += s.driftX * 0.005;
        s.graphic.y += s.driftY * 0.005;
        // 边界回绕
        if (s.graphic.x < -5) s.graphic.x = this.width + 5;
        if (s.graphic.x > this.width + 5) s.graphic.x = -5;
        if (s.graphic.y < -5) s.graphic.y = this.height + 5;
        if (s.graphic.y > this.height + 5) s.graphic.y = -5;
      }

      // 光晕呼吸
      if (this._glow) {
        const breath = 1 + 0.08 * Math.sin(elapsed * 0.4);
        this._glow.alpha = breath;
      }

      this._animFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  destroy() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this.container.destroy({ children: true });
  }
}
