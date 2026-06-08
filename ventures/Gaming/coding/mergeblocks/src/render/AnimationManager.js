// ============================================================
// AnimationManager — 合并时间线播放器（去掉粒子烟花）
// 阶段：吸附(弧线) → 冲击波+闪光 → 错峰下落 → 补块
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
    await this._phaseAbsorb(timeline, tileRenderer);
    await this._phaseUpgrade(timeline, tileRenderer);
    await this._phaseFallAndFill(timeline, tileRenderer, board);
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
        tween(this.app, 200, ease.inOutCubic, (e) => {
          const mt = 1 - e;
          sprite.x = mt * mt * startX + 2 * mt * e * ctrlX + e * e * targetPos.x;
          sprite.y = mt * mt * startY + 2 * mt * e * ctrlY + e * e * targetPos.y;
          sprite.scale.set(1 - e * 0.5);
          sprite.alpha = 1 - e * 0.3;
        })
      );
    }

    const targetSprite = tileRenderer.getTileSprite(timeline.upgradedTileId);
    if (targetSprite) {
      promises.push(
        tween(this.app, 200, ease.outQuad, (e) => {
          targetSprite.scale.set(1 + Math.sin(e * Math.PI * 2) * 0.03);
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

    // 更新 tile 显示
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

    // 闪光
    const flash = new PIXI.Graphics();
    flash.roundRect(-half, -half, size, size, radius);
    flash.fill({ color: 0xffffff, alpha: 0.7 });
    flash.x = targetSprite.x; flash.y = targetSprite.y;
    targetSprite.parent.addChild(flash);

    // 轻微冲击波
    const wave = new PIXI.Graphics();
    wave.x = targetSprite.x; wave.y = targetSprite.y;
    targetSprite.parent.addChild(wave);

    await Promise.all([
      tween(this.app, 320, ease.outElastic, (e) => {
        targetSprite.scale.set(0.7 + e * 0.3);
      }),
      tween(this.app, 200, ease.outQuad, (e) => {
        flash.alpha = 0.7 * (1 - e);
      }),
      tween(this.app, 300, ease.outCubic, (e) => {
        wave.clear();
        const r = size * 0.4 + size * 0.6 * e;
        wave.circle(0, 0, r);
        wave.stroke({ color: newPalette.bg, width: 1.5 * (1 - e), alpha: 0.35 * (1 - e) });
      }),
    ]);

    flash.parent.removeChild(flash); flash.destroy();
    wave.parent.removeChild(wave); wave.destroy();
    targetSprite.scale.set(1);

    // 飘字
    if (timeline.finalScore > 0) {
      this._spawnScorePopup(
        { x: targetSprite.x, y: targetSprite.y },
        `+${timeline.finalScore}`,
        targetSprite.parent
      );
    }
    if (timeline.comboCount >= 2) {
      this._spawnComboPopup(
        { x: targetSprite.x, y: targetSprite.y - 30 },
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
      const colDelay = col * 18;
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
      sprite.x = startPos.x; sprite.y = startPos.y;
      const distance = Math.abs(move.toRow - move.fromRow);
      const duration = 180 + distance * 25;
      promises.push(
        tween(this.app, duration, ease.outQuad, (e) => {
          sprite.y = startPos.y + (endPos.y - startPos.y) * e;
        }).then(() =>
          tween(this.app, 80, ease.outQuad, (e) => {
            sprite.scale.set(1 + Math.sin(e * Math.PI) * 0.06);
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
      const startY = endPos.y - tileRenderer.cellSize * (nt.row + 1) - 50;
      sprite.x = endPos.x; sprite.y = startY;
      sprite.alpha = 0; sprite.scale.set(0.7);
      const itemDelay = i * 35;
      promises.push(
        delay(itemDelay).then(() =>
          tween(this.app, 250, ease.outBack, (e) => {
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
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 20,
        fill: 0xffd54f, stroke: { color: 0x000000, width: 2, alpha: 0.4 },
      },
    });
    t.anchor.set(0.5, 0.5);
    t.x = pos.x; t.y = pos.y;
    parent.addChild(t);
    const startY = pos.y;
    tween(this.app, 700, ease.outCubic, (e) => {
      t.y = startY - 50 * e;
      t.alpha = 1 - Math.max(0, (e - 0.5) * 2);
      t.scale.set(1 + e * 0.3);
    }).then(() => {
      if (t.parent) t.parent.removeChild(t);
      t.destroy();
    });
  }

  _spawnComboPopup(pos, comboCount, parent) {
    const t = new PIXI.Text({
      text: `Combo \u00d7${comboCount}`,
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 16,
        fill: 0x80deea, stroke: { color: 0x000000, width: 2, alpha: 0.4 },
      },
    });
    t.anchor.set(0.5, 0.5);
    t.x = pos.x; t.y = pos.y;
    parent.addChild(t);
    const startY = pos.y;
    tween(this.app, 800, ease.outCubic, (e) => {
      t.y = startY - 40 * e;
      t.alpha = 1 - Math.max(0, (e - 0.5) * 2);
      t.scale.set(1 + e * 0.25);
    }).then(() => {
      if (t.parent) t.parent.removeChild(t);
      t.destroy();
    });
  }

  playInvalidFeedback(sprite) {
    if (!sprite) return;
    const origX = sprite.x;
    const duration = 250;
    const startTime = performance.now();
    const anim = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      sprite.x = origX + Math.sin(t * Math.PI * 6) * 3 * (1 - t);
      if (t >= 1) { sprite.x = origX; this.app.ticker.remove(anim); }
    };
    this.app.ticker.add(anim);
  }
}
