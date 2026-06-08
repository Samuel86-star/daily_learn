// ============================================================
// AnimationManager — 合并时间线播放器（Pro Max 版）
// 阶段：吸附(弧线) → 冲击波+升级闪光 → 错峰下落 → 补块 → 大组爆发
// ============================================================

import * as PIXI from 'pixi.js';
import { getTileColor } from '../game/config.js';

const ease = {
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outBack: t => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

function tween(app, durationMs, easeFn, onUpdate) {
  return new Promise(resolve => {
    const start = performance.now();
    const ticker = () => {
      const t = Math.min((performance.now() - start) / durationMs, 1);
      onUpdate(easeFn(t), t);
      if (t >= 1) {
        app.ticker.remove(ticker);
        resolve();
      }
    };
    app.ticker.add(ticker);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

export class AnimationManager {
  constructor(app, scale, layout, particleLayer) {
    this.app = app;
    this.scale = scale;
    this.layout = layout;
    this.particleLayer = particleLayer;
  }

  async playMergeTimeline(timeline, tileRenderer, board) {
    // 阶段 1: 吸附(弧线飞行) 220ms
    await this._phaseAbsorb(timeline, tileRenderer);

    // 阶段 2: 冲击波 + 升级闪光 360ms
    await this._phaseUpgrade(timeline, tileRenderer);

    // 阶段 3+4: 错峰下落 + 补块 ~400ms
    await this._phaseFallAndFill(timeline, tileRenderer, board);

    // 阶段 5: 大组/高 combo 爆发粒子 + 屏幕震动
    if (timeline.groupSize >= 8 || timeline.comboCount >= 7) {
      const pos = tileRenderer.getTilePos(timeline.targetRow, timeline.targetCol);
      const gx = (this.layout.boardMarginX + pos.x) * this.scale;
      const gy = (this.layout.boardMarginTop + pos.y) * this.scale;
      this.playBigGroupEffect(gx, gy, Math.max(timeline.groupSize, timeline.comboCount));
    }

    // 低层 Combo 也有小粒子
    if (timeline.comboCount >= 5 && timeline.groupSize < 8) {
      const pos = tileRenderer.getTilePos(timeline.targetRow, timeline.targetCol);
      const gx = (this.layout.boardMarginX + pos.x) * this.scale;
      const gy = (this.layout.boardMarginTop + pos.y) * this.scale;
      this._playSmallComboParticles(gx, gy, timeline.comboCount);
    }
  }

  async _phaseAbsorb(timeline, tileRenderer) {
    const targetPos = tileRenderer.getTilePos(timeline.targetRow, timeline.targetCol);
    const promises = [];

    for (const id of timeline.absorbedTileIds) {
      const sprite = tileRenderer.getTileSprite(id);
      if (!sprite) continue;
      const startX = sprite.x;
      const startY = sprite.y;
      const dx = targetPos.x - startX;
      const dy = targetPos.y - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curveAmount = Math.min(dist * 0.25, 40);
      const perpX = -dy / (dist || 1);
      const perpY = dx / (dist || 1);
      const ctrlX = startX + dx * 0.5 + perpX * curveAmount;
      const ctrlY = startY + dy * 0.5 + perpY * curveAmount;

      promises.push(
        tween(this.app, 220, ease.inOutCubic, (e) => {
          const mt = 1 - e;
          sprite.x = mt * mt * startX + 2 * mt * e * ctrlX + e * e * targetPos.x;
          sprite.y = mt * mt * startY + 2 * mt * e * ctrlY + e * e * targetPos.y;
          sprite.scale.set(1 - e * 0.5);
          sprite.alpha = 1 - e * 0.4;
        })
      );
    }

    const targetSprite = tileRenderer.getTileSprite(timeline.upgradedTileId);
    if (targetSprite) {
      promises.push(
        tween(this.app, 220, ease.outQuad, (e) => {
          targetSprite.scale.set(1 + Math.sin(e * Math.PI * 3) * 0.04);
        }).then(() => {
          targetSprite.scale.set(1);
        })
      );
    }

    await Promise.all(promises);

    for (const id of timeline.absorbedTileIds) {
      const sprite = tileRenderer.getTileSprite(id);
      if (sprite) {
        sprite.visible = false;
        if (sprite.parent) sprite.parent.removeChild(sprite);
        tileRenderer._pool.delete(id);
      }
    }
  }

  async _phaseUpgrade(timeline, tileRenderer) {
    const targetSprite = tileRenderer.getTileSprite(timeline.upgradedTileId);
    if (!targetSprite) return;

    const newPalette = getTileColor(timeline.resultValue);
    const size = tileRenderer.cellSize;
    const half = size / 2;
    const radius = size * 0.22;

    if (targetSprite._text) {
      targetSprite._text.text = timeline.resultValue.toString();
      const len = timeline.resultValue.toString().length;
      let fontScale = 0.42;
      if (len >= 5) fontScale = 0.22;
      else if (len >= 4) fontScale = 0.28;
      else if (len >= 3) fontScale = 0.34;
      targetSprite._text.style.fontSize = size * fontScale;
      targetSprite._text.style.fill = newPalette.text;
    }
    if (targetSprite._bg) {
      targetSprite._bg.clear();
      targetSprite._bg.roundRect(-half, -half, size, size, radius);
      targetSprite._bg.fill({ color: newPalette.bg });
    }
    if (targetSprite._highlight) {
      targetSprite._highlight.clear();
      targetSprite._highlight.roundRect(-half + 2, -half + 2, size - 4, size * 0.45, radius - 2);
      targetSprite._highlight.fill({ color: newPalette.hi, alpha: 0.55 });
      targetSprite._highlight.roundRect(-half + 6, -half + 4, size - 12, size * 0.12, radius * 0.6);
      targetSprite._highlight.fill({ color: 0xffffff, alpha: 0.25 });
    }

    // 白色闪光
    const flash = new PIXI.Graphics();
    flash.roundRect(-half, -half, size, size, radius);
    flash.fill({ color: 0xffffff, alpha: 0.9 });
    flash.x = targetSprite.x;
    flash.y = targetSprite.y;
    targetSprite.parent.addChild(flash);

    // 冲击波环
    const shockwave = new PIXI.Graphics();
    shockwave.x = targetSprite.x;
    shockwave.y = targetSprite.y;
    targetSprite.parent.addChild(shockwave);

    await Promise.all([
      tween(this.app, 360, ease.outElastic, (e) => {
        targetSprite.scale.set(0.6 + e * 0.4);
      }),
      tween(this.app, 240, ease.outQuad, (e) => {
        flash.alpha = 0.9 * (1 - e);
      }),
      tween(this.app, 360, ease.outCubic, (e) => {
        shockwave.clear();
        const r = size * 0.4 + size * 0.8 * e;
        shockwave.circle(0, 0, r);
        shockwave.stroke({ color: newPalette.bg, width: 2 * (1 - e), alpha: 0.4 * (1 - e) });
        shockwave.circle(0, 0, r * 0.85);
        shockwave.stroke({ color: 0xffffff, width: 1 * (1 - e), alpha: 0.3 * (1 - e) });
      }),
    ]);

    if (flash.parent) flash.parent.removeChild(flash);
    flash.destroy();
    if (shockwave.parent) shockwave.parent.removeChild(shockwave);
    shockwave.destroy();
    targetSprite.scale.set(1);

    // 飘字 — 分数
    if (timeline.finalScore > 0) {
      this._spawnScorePopup(
        { x: targetSprite.x, y: targetSprite.y },
        `+${timeline.finalScore}`,
        targetSprite.parent
      );
    }
    // 高级数字到达 512+ 时额外飘字
    if (timeline.resultValue >= 1024) {
      setTimeout(() => {
        this._spawnMilestonePopup(
          { x: targetSprite.x, y: targetSprite.y - 20 },
          timeline.resultValue >= 2048 ? '⚡ 传奇合成 ⚡' : `✦ ${timeline.resultValue} ✦`,
          targetSprite.parent
        );
      }, 400);
    }
    // Combo 飘字（已移到 UIManager 展示，这里保留简短飘字）
    if (timeline.comboCount >= 2) {
      this._spawnComboPopup(
        { x: targetSprite.x, y: targetSprite.y - 35 },
        timeline.comboCount,
        targetSprite.parent
      );
    }
  }

  async _phaseFallAndFill(timeline, tileRenderer, board) {
    const movementsByCol = {};
    const newTilesByCol = {};

    for (const move of timeline.movements) {
      if (!movementsByCol[move.col]) movementsByCol[move.col] = [];
      movementsByCol[move.col].push(move);
    }
    for (const nt of timeline.newTiles) {
      if (!newTilesByCol[nt.col]) newTilesByCol[nt.col] = [];
      newTilesByCol[nt.col].push(nt);
    }

    const allCols = new Set([
      ...Object.keys(movementsByCol).map(Number),
      ...Object.keys(newTilesByCol).map(Number),
    ]);

    const allPromises = [];
    for (const col of allCols) {
      const colDelay = col * 20;
      allPromises.push(this._fallColumn(col, movementsByCol[col] || [], newTilesByCol[col] || [], colDelay, tileRenderer, board));
    }

    await Promise.all(allPromises);

    for (const move of timeline.movements) {
      const sprite = tileRenderer.getTileSprite(move.tileId);
      if (!sprite) continue;
      const endPos = tileRenderer.getTilePos(move.toRow, move.col);
      sprite.x = endPos.x; sprite.y = endPos.y;
      sprite.scale.set(1); sprite.alpha = 1;
    }
    for (const nt of timeline.newTiles) {
      const sprite = tileRenderer.getTileSprite(nt.tileId);
      if (!sprite) continue;
      const endPos = tileRenderer.getTilePos(nt.row, nt.col);
      sprite.x = endPos.x; sprite.y = endPos.y;
      sprite.scale.set(1); sprite.alpha = 1;
    }
  }

  async _fallColumn(col, movements, newTiles, startDelayMs, tileRenderer, board) {
    if (startDelayMs > 0) await delay(startDelayMs);
    const promises = [];

    for (const move of movements) {
      const sprite = tileRenderer.getTileSprite(move.tileId);
      if (!sprite) continue;
      const startPos = tileRenderer.getTilePos(move.fromRow, move.col);
      const endPos = tileRenderer.getTilePos(move.toRow, move.col);
      sprite.x = startPos.x;
      sprite.y = startPos.y;
      const distance = Math.abs(move.toRow - move.fromRow);
      const duration = 200 + distance * 30;
      promises.push(
        tween(this.app, duration, ease.outQuad, (e) => {
          sprite.y = startPos.y + (endPos.y - startPos.y) * e;
        }).then(() =>
          tween(this.app, 100, ease.outQuad, (e) => {
            sprite.scale.set(1 + Math.sin(e * Math.PI) * 0.08);
          })
        )
      );
    }

    const sortedNew = newTiles.slice().sort((a, b) => a.row - b.row);
    for (let i = 0; i < sortedNew.length; i++) {
      const nt = sortedNew[i];
      const tile = board.get(nt.row, nt.col);
      if (!tile) continue;

      let sprite = tileRenderer.getTileSprite(tile.id);
      if (!sprite) {
        sprite = tileRenderer._createTileSprite();
        tileRenderer._pool.set(tile.id, sprite);
        tileRenderer.container.addChild(sprite);
        tileRenderer._updateTileSprite(sprite, tile);
      }

      const endPos = tileRenderer.getTilePos(nt.row, nt.col);
      const startY = endPos.y - tileRenderer.cellSize * (nt.row + 1) - 60;
      sprite.x = endPos.x;
      sprite.y = startY;
      sprite.alpha = 0;
      sprite.scale.set(0.7);

      const itemDelay = i * 40;
      promises.push(
        delay(itemDelay).then(() =>
          tween(this.app, 280, ease.outBack, (e) => {
            sprite.y = startY + (endPos.y - startY) * e;
            sprite.alpha = Math.min(1, e * 2.5);
            sprite.scale.set(0.7 + 0.3 * e);
          })
        )
      );
    }

    await Promise.all(promises);
  }

  _spawnScorePopup(pos, text, parent) {
    const t = new PIXI.Text({
      text,
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 24,
        fill: 0xffd54f, stroke: { color: 0x000000, width: 3, alpha: 0.5 },
      },
    });
    t.anchor.set(0.5, 0.5);
    t.x = pos.x; t.y = pos.y;
    parent.addChild(t);

    const startY = pos.y;
    tween(this.app, 800, ease.outCubic, (e) => {
      t.y = startY - 60 * e;
      t.alpha = 1 - Math.max(0, (e - 0.5) * 2);
      t.scale.set(1 + e * 0.4);
    }).then(() => {
      if (t.parent) t.parent.removeChild(t);
      t.destroy();
    });
  }

  _spawnMilestonePopup(pos, text, parent) {
    const t = new PIXI.Text({
      text,
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 22,
        fill: 0xff7043, stroke: { color: 0x000000, width: 3, alpha: 0.5 },
      },
    });
    t.anchor.set(0.5, 0.5);
    t.x = pos.x; t.y = pos.y;
    parent.addChild(t);

    const startY = pos.y;
    tween(this.app, 1200, ease.outCubic, (e) => {
      t.y = startY - 80 * e;
      t.alpha = 1 - Math.max(0, (e - 0.4) * 1.67);
      t.scale.set(0.8 + e * 0.6);
    }).then(() => {
      if (t.parent) t.parent.removeChild(t);
      t.destroy();
    });
  }

  _spawnComboPopup(pos, comboCount, parent) {
    const t = new PIXI.Text({
      text: `Combo ×${comboCount}`,
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 18,
        fill: 0x80deea, stroke: { color: 0x000000, width: 2, alpha: 0.5 },
      },
    });
    t.anchor.set(0.5, 0.5);
    t.x = pos.x; t.y = pos.y;
    parent.addChild(t);

    const startY = pos.y;
    tween(this.app, 900, ease.outCubic, (e) => {
      t.y = startY - 50 * e;
      t.alpha = 1 - Math.max(0, (e - 0.6) * 2.5);
      t.scale.set(1 + e * 0.3);
    }).then(() => {
      if (t.parent) t.parent.removeChild(t);
      t.destroy();
    });
  }

  playBigGroupEffect(globalX, globalY, intensity) {
    if (!this.particleLayer) return;
    const count = Math.min(intensity * 5, 60);
    const palette = [0xffd54f, 0xee5a8a, 0xa855f7, 0x4f7df5, 0x26a69a, 0x66bb6a, 0xff7043];

    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const r = 2 + Math.random() * 4;
      const shape = Math.random();
      if (shape < 0.3) {
        p.circle(0, 0, r);
      } else if (shape < 0.6) {
        p.rect(-r / 2, -r / 2, r, r);
      } else {
        p.poly([0, -r, r * 0.866, r * 0.5, -r * 0.866, r * 0.5]);
      }
      p.fill({ color: palette[i % palette.length], alpha: 0.95 });
      p.x = globalX;
      p.y = globalY;
      this.particleLayer.addChild(p);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 100 + Math.random() * 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const duration = 700 + Math.random() * 500;
      const startTime = performance.now();
      const gravity = 120;

      const anim = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const e = ease.outCubic(t);
        p.x = globalX + vx * e * 0.5;
        p.y = globalY + vy * e * 0.5 + gravity * e * e * 0.5;
        p.alpha = 1 - t;
        p.scale.set(1 - t * 0.5);
        p.rotation = t * Math.PI * 2;
        if (t >= 1) {
          this.app.ticker.remove(anim);
          if (p.parent) p.parent.removeChild(p);
          p.destroy();
        }
      };
      this.app.ticker.add(anim);
    }
  }

  _playSmallComboParticles(globalX, globalY, comboCount) {
    if (!this.particleLayer) return;
    const count = comboCount * 2;
    const palette = [0x80deea, 0x4dd0e1, 0x26c6da];

    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      p.circle(0, 0, 1.5 + Math.random() * 2);
      p.fill({ color: palette[i % palette.length], alpha: 0.85 });
      p.x = globalX;
      p.y = globalY;
      this.particleLayer.addChild(p);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 80;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const duration = 400 + Math.random() * 300;
      const startTime = performance.now();

      const anim = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        p.x = globalX + vx * t;
        p.y = globalY + vy * t;
        p.alpha = 1 - t;
        if (t >= 1) {
          this.app.ticker.remove(anim);
          if (p.parent) p.parent.removeChild(p);
          p.destroy();
        }
      };
      this.app.ticker.add(anim);
    }
  }

  playInvalidFeedback(sprite) {
    if (!sprite) return;
    const origX = sprite.x;
    const duration = 250;
    const startTime = performance.now();
    const anim = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      sprite.x = origX + Math.sin(t * Math.PI * 6) * 4 * (1 - t);
      if (t >= 1) {
        sprite.x = origX;
        this.app.ticker.remove(anim);
      }
    };
    this.app.ticker.add(anim);
  }

  destroy() {}
}
