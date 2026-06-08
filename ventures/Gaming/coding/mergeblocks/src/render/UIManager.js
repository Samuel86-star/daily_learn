// ============================================================
// UIManager — Pro Max 版：卡片式设计 + 发光效果 + 立体按钮
// ============================================================

import * as PIXI from 'pixi.js';
import { ITEM_PRICES, COLORS } from '../game/config.js';
import { ProgressBar } from './ProgressBar.js';

export class UIManager {
  constructor(root, designWidth, designHeight, layout) {
    this.root = root;
    this.container = new PIXI.Container();
    this.root.addChild(this.container);

    this.designWidth = designWidth;
    this.designHeight = designHeight;
    this.layout = layout;

    this._onItemClick = null;
    this._onSoundToggle = null;
    this._elements = {};
    this._lastScore = 0;
    this._lastCombo = 0;
  }

  setOnItemClick(fn) { this._onItemClick = fn; }
  setOnSoundToggle(fn) { this._onSoundToggle = fn; }
  setSoundMuted(muted) {
    if (this._elements.soundLabel) {
      this._elements.soundLabel.text = muted ? '🔇' : '🔊';
    }
  }

  build(boardW, boardH) {
    const c = this.container;
    const w = this.designWidth;
    c.removeChildren();

    this._buildTopCards(w);
    this._elements.progress = new ProgressBar(c, w, 140);

    const bottomY = this.layout.boardMarginTop + boardH + 20;
    this._buildItemButtons(w, bottomY);
    this._buildQuestPanel(w, bottomY + 72);
    this._buildBottomDecoration(w);
  }

  // ============= 顶部卡片 =============
  _buildTopCards(w) {
    const c = this.container;

    // 左侧：分数卡片
    const scoreCard = this._createCard(16, 20, 130, 80, 0x1a0d40, 0.9);
    c.addChild(scoreCard);

    const scoreLabel = new PIXI.Text({
      text: '分数',
      style: { fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x9d88c8, letterSpacing: 1 },
    });
    scoreLabel.x = 26; scoreLabel.y = 28;
    c.addChild(scoreLabel);

    const scoreText = new PIXI.Text({
      text: '0',
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 32,
        fill: 0xffffff, stroke: { color: 0x000000, width: 3, alpha: 0.4 },
      },
    });
    scoreText.x = 26; scoreText.y = 48;
    c.addChild(scoreText);
    this._elements.scoreText = scoreText;

    // 右侧：最高数字卡片
    const maxCard = this._createCard(w - 146, 20, 130, 80, 0x1a0d40, 0.9);
    c.addChild(maxCard);

    const maxLabel = new PIXI.Text({
      text: '最高数字',
      style: { fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x9d88c8, letterSpacing: 1 },
    });
    maxLabel.anchor.set(1, 0);
    maxLabel.x = w - 26; maxLabel.y = 28;
    c.addChild(maxLabel);

    const maxText = new PIXI.Text({
      text: '2',
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 28,
        fill: 0xffeb3b, stroke: { color: 0x000000, width: 3, alpha: 0.4 },
      },
    });
    maxText.anchor.set(1, 0);
    maxText.x = w - 26; maxText.y = 50;
    c.addChild(maxText);
    this._elements.maxText = maxText;

    // 右上角：金币
    const coinBg = new PIXI.Graphics();
    coinBg.roundRect(w - 90, 9, 74, 26, 13);
    coinBg.fill({ color: 0x2b1855, alpha: 0.8 });
    coinBg.stroke({ color: 0x6c47b0, width: 1, alpha: 0.5 });
    c.addChild(coinBg);

    const coinIcon = new PIXI.Text({ text: '✦', style: { fontSize: 18, fill: 0xffd54f } });
    coinIcon.x = w - 82; coinIcon.y = 11;
    c.addChild(coinIcon);

    const coinText = new PIXI.Text({
      text: '0',
      style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 14, fill: 0xffd54f },
    });
    coinText.x = w - 60; coinText.y = 13;
    c.addChild(coinText);
    this._elements.coinText = coinText;

    // 装饰 + 静音按钮（带事件）
    this._addIconButton(12, 12, '☰', 20);
    const soundBtn = this._addIconButton(w - 72, 12, '🔊', 18, () => {
      if (this._onSoundToggle) this._onSoundToggle();
    });
    this._elements.soundLabel = soundBtn._label;
    this._addIconButton(w - 38, 12, '⚙', 22);
  }

  // ============= 道具按钮 =============
  _buildItemButtons(w, y) {
    const c = this.container;
    const btnW = 120;
    const btnH = 58;
    const gap = 12;
    const totalW = 3 * btnW + 2 * gap;
    const startX = (w - totalW) / 2;

    const items = [
      { key: 'undo', label: '撤销', icon: '↶', color: 0x7c57c0, shadow: 0x4a2e80 },
      { key: 'hammer', label: '消除', icon: '⚡', color: 0x5a97c0, shadow: 0x2e6080 },
      { key: 'shuffle', label: '重排', icon: '⟳', color: 0x57c07c, shadow: 0x2e804a },
    ];

    this._elements.itemButtons = {};

    items.forEach((item, i) => {
      const x = startX + i * (btnW + gap);
      const container = new PIXI.Container();
      container.x = x;
      container.y = y;
      container.eventMode = 'static';
      container.cursor = 'pointer';

      const shadow = new PIXI.Graphics();
      shadow.roundRect(2, 6, btnW, btnH, 14);
      shadow.fill({ color: item.shadow, alpha: 0.6 });
      container.addChild(shadow);

      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, btnW, btnH, 14);
      bg.fill({ color: item.color });
      bg.beginPath();
      bg.arc(btnW / 2, btnH / 2, btnW / 2, Math.PI, 0);
      bg.lineTo(btnW, 0); bg.lineTo(0, 0); bg.closePath();
      bg.fill({ color: 0xffffff, alpha: 0.15 });
      container.addChild(bg);

      const icon = new PIXI.Text({ text: item.icon, style: { fontSize: 22, fill: 0xffffff } });
      icon.anchor.set(0.5, 0); icon.x = btnW / 2; icon.y = 8;
      container.addChild(icon);

      const label = new PIXI.Text({
        text: item.label,
        style: { fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: 14, fill: 0xffffff },
      });
      label.anchor.set(0.5, 0); label.x = btnW / 2; label.y = 32;
      container.addChild(label);

      const countText = new PIXI.Text({
        text: '1 次',
        style: { fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0xd4c8ff },
      });
      countText.anchor.set(0.5, 0); countText.x = btnW / 2; countText.y = 51;
      container.addChild(countText);

      container.on('pointerdown', () => {
        shadow.y = 3; bg.y = -3; icon.y = 5; label.y = 29; countText.y = 48;
      });
      container.on('pointerup', () => {
        shadow.y = 6; bg.y = 0; icon.y = 8; label.y = 32; countText.y = 51;
        if (this._onItemClick) this._onItemClick(item.key);
      });
      container.on('pointerupoutside', () => {
        shadow.y = 6; bg.y = 0; icon.y = 8; label.y = 32; countText.y = 51;
      });

      shadow.y = 6;
      c.addChild(container);
      this._elements.itemButtons[item.key] = { container, bg, shadow, countText };
    });
  }

  // ============= 任务面板 =============
  _buildQuestPanel(w, y) {
    const c = this.container;
    const panelW = w - 24;
    const panelX = 16;

    const shadow = new PIXI.Graphics();
    shadow.roundRect(panelX + 2, y + 4, panelW, 118, 16);
    shadow.fill({ color: 0x0a0518, alpha: 0.6 });
    c.addChild(shadow);

    const bg = new PIXI.Graphics();
    bg.roundRect(panelX, y, panelW, 118, 16);
    bg.fill({ color: 0x150830, alpha: 0.95 });
    bg.stroke({ color: 0x6040b0, width: 1.5, alpha: 0.35 });
    c.addChild(bg);

    const topGlow = new PIXI.Graphics();
    topGlow.roundRect(panelX, y, panelW, 28, 16);
    topGlow.fill({ color: 0x8a63e6, alpha: 0.08 });
    c.addChild(topGlow);

    const title = new PIXI.Text({
      text: '本局任务',
      style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 15, fill: 0xffeb3b, letterSpacing: 1 },
    });
    title.x = panelX + 20; title.y = y + 10;
    c.addChild(title);

    this._elements.questY = y + 36;
    this._elements.questDisplays = [];
  }

  // ============= 底部装饰 =============
  _buildBottomDecoration(w) {
    const glow = new PIXI.Graphics();
    const grad = new PIXI.FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 }, end: { x: w, y: 0 },
      colorStops: [
        { offset: 0, color: 0x6c47b0, alpha: 0 },
        { offset: 0.5, color: 0x6c47b0, alpha: 0.08 },
        { offset: 1, color: 0x6c47b0, alpha: 0 },
      ],
      textureSpace: 'global',
    });
    glow.rect(0, this.designHeight - 40, w, 40);
    glow.fill(grad);
    this.container.addChild(glow);

    const version = new PIXI.Text({
      text: '星图能量网 · 点击同色连通块合并',
      style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: 0x4a3a6a },
    });
    version.anchor.set(0.5, 0);
    version.x = w / 2;
    version.y = this.designHeight - 22;
    this.container.addChild(version);
  }

  // ============= 辅助工具 =============
  _createCard(x, y, w, h, color, alpha) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;

    const shadow = new PIXI.Graphics();
    shadow.roundRect(2, 4, w, h, 16);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    c.addChild(shadow);

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, 16);
    bg.fill({ color, alpha });
    bg.stroke({ color: 0x6040b0, width: 1.5, alpha: 0.3 });
    c.addChild(bg);

    const highlight = new PIXI.Graphics();
    highlight.roundRect(0, 0, w, 25, 16);
    highlight.fill({ color: 0xffffff, alpha: 0.06 });
    c.addChild(highlight);

    return c;
  }

  _addIconButton(x, y, icon, size, onClick) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;
    c.eventMode = 'static';
    c.cursor = onClick ? 'pointer' : 'default';

    const btn = new PIXI.Graphics();
    btn.roundRect(0, 0, 36, 36, 12);
    btn.fill({ color: 0x2b1855, alpha: 0.7 });
    btn.stroke({ color: 0x6c47b0, width: 1, alpha: 0.4 });
    c.addChild(btn);

    const t = new PIXI.Text({ text: icon, style: { fontSize: size, fill: 0xd4c8ff } });
    t.anchor.set(0.5);
    t.x = 18; t.y = 18;
    c.addChild(t);
    c._label = t;

    if (onClick) {
      c.on('pointerdown', () => { btn.fill({ color: 0x1a0a40, alpha: 0.9 }); });
      c.on('pointerup', () => { btn.fill({ color: 0x2b1855, alpha: 0.7 }); onClick(); });
      c.on('pointerupoutside', () => { btn.fill({ color: 0x2b1855, alpha: 0.7 }); });
    }

    this.container.addChild(c);
    return c;
  }

  // ============= 状态更新 =============
  update(state) {
    if (this._lastScore !== state.score) {
      this._animateScoreChange(this._lastScore, state.score);
      this._lastScore = state.score;
    }
    this._elements.scoreText.text = state.score.toLocaleString();
    this._elements.maxText.text = state.maxTile.toString();
    this._elements.coinText.text = state.economy.coins.toString();

    this._elements.progress.update(state.maxTile);
    this._updateCombo(state.combo.count);

    for (const key of ['undo', 'hammer', 'shuffle']) {
      const btn = this._elements.itemButtons?.[key];
      if (!btn) continue;
      const count = state.items.freeUses[key] || 0;
      const price = ITEM_PRICES[key];
      if (count > 0) {
        btn.countText.text = `${count} 次`;
        btn.countText.style.fill = 0xd4c8ff;
      } else {
        btn.countText.text = `${price}✦`;
        btn.countText.style.fill = 0xffd54f;
      }
      if (count <= 0 && !btn._noUseGlow) {
        btn._noUseGlow = new PIXI.Graphics();
        btn._noUseGlow.roundRect(-1, -1, 122, 60, 15);
        btn._noUseGlow.stroke({ color: 0xffd54f, width: 1.5, alpha: 0.3 });
        btn.container.addChild(btn._noUseGlow);
      } else if (count > 0 && btn._noUseGlow) {
        btn.container.removeChild(btn._noUseGlow);
        btn._noUseGlow.destroy();
        btn._noUseGlow = null;
      }
    }

    this._updateQuests(state);
  }

  _updateCombo(count) {
    if (!this._elements.comboContainer) {
      this._elements.comboContainer = new PIXI.Container();
      this._elements.comboContainer.y = 100;
      this._elements.comboContainer.x = 26;
      this.container.addChild(this._elements.comboContainer);
    }

    const cc = this._elements.comboContainer;
    if (this._lastCombo === count && cc.children.length > 0) return;
    this._lastCombo = count;
    cc.removeChildren();

    if (count >= 2) {
      const bg = new PIXI.Graphics();
      bg.roundRect(-6, -6, 140, 32, 8);
      bg.fill({ color: 0x0d2d3a, alpha: 0.7 });
      bg.stroke({ color: 0x80deea, width: 1.5, alpha: 0.5 });
      cc.addChild(bg);

      const label = new PIXI.Text({
        text: `连击 ×${count}`,
        style: {
          fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 20,
          fill: 0x80deea, stroke: { color: 0x000000, width: 3, alpha: 0.5 },
        },
      });
      cc.addChild(label);

      const mult = this._comboMult(count);
      const multLabel = new PIXI.Text({
        text: `×${mult.toFixed(2)}`,
        style: { fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0x4dd0e1 },
      });
      multLabel.x = label.width + 8; multLabel.y = 4;
      cc.addChild(multLabel);

      cc.alpha = 0; cc.scale.set(0.5);
      const start = performance.now();
      const anim = () => {
        const t = Math.min((performance.now() - start) / 300, 1);
        const e = 1 - Math.pow(1 - t, 3);
        cc.alpha = e; cc.scale.set(0.5 + 0.5 * e);
        if (t < 1) requestAnimationFrame(anim);
      };
      anim();
    }
  }

  _comboMult(count) {
    if (count >= 12) return 1.7;
    if (count >= 8) return 1.45;
    if (count >= 5) return 1.25;
    if (count >= 3) return 1.1;
    return 1.0;
  }

  _animateScoreChange(oldVal, newVal) {
    const t = this._elements.scoreText;
    if (!t) return;
    const baseY = 48;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(elapsed / 300, 1);
      t.y = baseY - Math.sin(p * Math.PI) * 8;
      t.style.fill = p < 0.3 ? 0xffd54f : 0xffffff;
      if (p < 1) requestAnimationFrame(tick);
      else t.y = baseY;
    };
    tick();
  }

  _updateQuests(state) {
    if (!this._elements.questY) return;
    const quests = state.quest.getActiveWithStatus();
    const visible = quests.slice(0, 3);

    for (const d of this._elements.questDisplays) {
      if (d.parent) d.parent.removeChild(d);
      d.destroy({ children: true });
    }
    this._elements.questDisplays = [];

    visible.forEach((q, i) => {
      const container = new PIXI.Container();
      container.x = 32;
      container.y = this._elements.questY + i * 26;
      this.container.addChild(container);
      this._elements.questDisplays.push(container);

      const circle = new PIXI.Graphics();
      if (q.completed) {
        circle.circle(7, 7, 7);
        circle.fill({ color: 0x66bb6a, alpha: 0.8 });
        const check = new PIXI.Text({ text: '✓', style: { fontSize: 11, fill: 0xffffff } });
        check.anchor.set(0.5); check.x = 7; check.y = 7;
        container.addChild(check);
      } else {
        circle.circle(7, 7, 6);
        circle.fill({ color: 0x3b2b70, alpha: 0.6 });
        circle.stroke({ color: 0x6c47b0, width: 1, alpha: 0.5 });
      }
      container.addChild(circle);

      const text = new PIXI.Text({
        text: q.desc,
        style: {
          fontFamily: 'Arial, sans-serif', fontSize: 13,
          fill: q.completed ? 0x88ddaa : 0xb8a4d8,
        },
      });
      text.x = 20; text.y = 0;
      container.addChild(text);
    });
  }

  // ============= 结算弹窗 =============
  showResult(result, onNewGame) {
    const cx = this.designWidth / 2;
    const cy = this.designHeight / 2;
    const panelW = 300;
    const panelH = 380;

    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, this.designWidth, this.designHeight);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    overlay.eventMode = 'static';
    this.container.addChild(overlay);
    this._elements.resultOverlay = overlay;

    const panel = this._createCard(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 0x150830, 1);
    panel.alpha = 0;
    panel.scale.set(0.8);
    this.container.addChild(panel);
    this._elements.resultPanel = panel;

    const startTime = performance.now();
    const enterAnim = () => {
      const t = Math.min((performance.now() - startTime) / 400, 1);
      const e = 1 - Math.pow(1 - t, 3);
      panel.alpha = e;
      panel.scale.set(0.8 + 0.2 * e);
      if (t >= 1) {
        panel.scale.set(1);
        this._buildResultContent(cx, cy, panelW, panelH, result, onNewGame);
        return;
      }
      requestAnimationFrame(enterAnim);
    };
    enterAnim();
  }

  _buildResultContent(cx, cy, panelW, panelH, result, onNewGame) {
    let titleText = '本局完成！';
    let subtext = '';
    if (result.maxTile >= 2048) { titleText = '🎉 传奇合成！'; subtext = '2048 已达成！'; }
    else if (result.maxTile >= 512) { titleText = '🌟 了不起！'; subtext = '合成 512+！'; }
    else if (result.maxTile >= 128) { titleText = '✨ 干得漂亮！'; subtext = '合成 128+！'; }
    else if (result.score > 5000) { titleText = '🔥 高分！'; subtext = '继续挑战吧'; }

    const title = new PIXI.Text({
      text: titleText,
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 28,
        fill: 0xffd54f, stroke: { color: 0x000000, width: 3, alpha: 0.4 },
      },
    });
    title.anchor.set(0.5, 0);
    title.x = cx;
    title.y = cy - panelH / 2 + 30;
    this.container.addChild(title);

    if (subtext) {
      const sub = new PIXI.Text({
        text: subtext,
        style: { fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0xb8a4d8 },
      });
      sub.anchor.set(0.5, 0);
      sub.x = cx;
      sub.y = cy - panelH / 2 + 66;
      this.container.addChild(sub);
    }

    const stats = [
      { label: '最终分数', value: result.score.toLocaleString(), color: 0xffffff },
      { label: '最高数字', value: result.maxTile.toString(), color: 0xffeb3b },
      { label: '合并次数', value: result.totalMerges.toString(), color: 0xd4c8ff },
      ...(result.maxCombo >= 3 ? [{ label: '最高连击', value: `${result.maxCombo}×`, color: 0x80deea }] : []),
    ];

    const statsStartY = cy - panelH / 2 + (subtext ? 90 : 78);

    stats.forEach((s, i) => {
      const label = new PIXI.Text({
        text: s.label,
        style: { fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x9d88c8 },
      });
      label.anchor.set(0.5, 0);
      label.x = cx;
      label.y = statsStartY + i * 42;
      this.container.addChild(label);

      const val = new PIXI.Text({
        text: s.value,
        style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 22, fill: s.color },
      });
      val.anchor.set(0.5, 0);
      val.x = cx;
      val.y = statsStartY + 18 + i * 42;
      this.container.addChild(val);
    });

    const divider = new PIXI.Graphics();
    divider.rect(cx - 100, statsStartY + stats.length * 42 + 10, 200, 1);
    divider.fill({ color: 0x4a2f80, alpha: 0.5 });
    this.container.addChild(divider);

    const rewardY = statsStartY + stats.length * 42 + 24;
    const coinLabel = new PIXI.Text({
      text: '获得金币',
      style: { fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x9d88c8 },
    });
    coinLabel.anchor.set(0.5, 0);
    coinLabel.x = cx;
    coinLabel.y = rewardY;
    this.container.addChild(coinLabel);

    const coinVal = new PIXI.Text({
      text: `+ ${result.coins || 20} ✦`,
      style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 24, fill: 0xffd54f },
    });
    coinVal.anchor.set(0.5, 0);
    coinVal.x = cx;
    coinVal.y = rewardY + 22;
    this.container.addChild(coinVal);

    const btnW = 200;
    const btnH = 54;
    const btnY = cy + panelH / 2 - btnH - 22;

    const btnShadow = new PIXI.Graphics();
    btnShadow.roundRect(cx - btnW / 2 + 2, btnY + 5, btnW, btnH, 16);
    btnShadow.fill({ color: 0x306020, alpha: 0.7 });
    this.container.addChild(btnShadow);

    const btn = new PIXI.Graphics();
    btn.roundRect(cx - btnW / 2, btnY, btnW, btnH, 16);
    const btnGrad = new PIXI.FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 }, end: { x: 0, y: btnH },
      colorStops: [
        { offset: 0, color: 0x5cbf60 },
        { offset: 1, color: 0x3a9f40 },
      ],
      textureSpace: 'local',
    });
    btn.fill(btnGrad);
    btn.beginPath();
    btn.arc(cx, btnY, btnW / 2, Math.PI, 0);
    btn.lineTo(cx + btnW / 2, btnY);
    btn.lineTo(cx - btnW / 2, btnY);
    btn.closePath();
    btn.fill({ color: 0xffffff, alpha: 0.2 });
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    this.container.addChild(btn);

    const btnText = new PIXI.Text({
      text: '再来一局',
      style: {
        fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 20,
        fill: 0xffffff, stroke: { color: 0x000000, width: 2, alpha: 0.3 },
      },
    });
    btnText.anchor.set(0.5, 0.5);
    btnText.x = cx;
    btnText.y = btnY + btnH / 2;
    this.container.addChild(btnText);

    btn.on('pointerdown', () => {
      btnShadow.y = 3; btn.y = 3; btnText.y = btnY + btnH / 2 + 3;
    });
    btn.on('pointerup', () => {
      btnShadow.y = 0; btn.y = 0; btnText.y = btnY + btnH / 2;
      this._clearResult(() => { if (onNewGame) onNewGame(); });
    });
    btn.on('pointerupoutside', () => {
      btnShadow.y = 0; btn.y = 0; btnText.y = btnY + btnH / 2;
    });
  }

  _clearResult(callback) {
    const keys = ['resultOverlay', 'resultPanel'];
    for (const k of keys) {
      const el = this._elements[k];
      if (el && el.parent) {
        el.parent.removeChild(el);
        el.destroy({ children: true });
      }
      delete this._elements[k];
    }
    if (callback) callback();
  }
}
