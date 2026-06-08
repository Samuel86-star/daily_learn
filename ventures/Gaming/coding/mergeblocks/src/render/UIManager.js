// ============================================================
// UIManager — V3 清爽版：任务凸显 + 砍掉里程碑 + 棋盘最大化
// ============================================================

import * as PIXI from 'pixi.js';
import { ITEM_PRICES, COLORS } from '../game/config.js';

const QUEST_ICONS = {
  reach_128: '🎯', reach_512: '🎯', reach_2048: '👑',
  big_merge_4: '⚡', big_merge_6: '🔥',
  combo_8: '🔗',
  score_3000: '💎', score_10000: '💎',
  shuffle_use: '🔄', merge_10_times: '⚡',
};

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
    if (this._elements.soundLabel) this._elements.soundLabel.text = muted ? '🔇' : '🔊';
  }

  build(boardW, boardH) {
    this.container.removeChildren();
    const w = this.designWidth;
    this._buildTopCards(w);
    this._buildQuestPanel(w, 94);
    this._buildItemButtons(w, this.layout.boardMarginTop + boardH + 20);
    this._buildBottomDecoration(w);
  }

  // ============= 顶部信息 =============
  _buildTopCards(w) {
    const c = this.container;

    // 左侧分数卡片
    const scoreCard = this._createCard(16, 16, 130, 68, 0x1a0d40, 0.9);
    c.addChild(scoreCard);

    const scoreLabel = new PIXI.Text({
      text: '分数', style: { fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0x9d88c8, letterSpacing: 1 },
    });
    scoreLabel.x = 24; scoreLabel.y = 22;
    c.addChild(scoreLabel);

    const scoreText = new PIXI.Text({
      text: '0', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 26, fill: 0xffffff, stroke: { color: 0x000000, width: 3, alpha: 0.4 } },
    });
    scoreText.x = 24; scoreText.y = 38;
    c.addChild(scoreText);
    this._elements.scoreText = scoreText;

    // 分数卡片内连击小标签
    const comboInScore = new PIXI.Text({
      text: '', style: { fontSize: 10, fill: 0x80deea, fontWeight: 'bold' },
    });
    comboInScore.anchor.set(1, 1);
    comboInScore.x = 130 - 10;
    comboInScore.y = 68 - 6;
    scoreCard.addChild(comboInScore);
    this._elements.comboInScore = comboInScore;

    // 右侧最高数字卡片
    const maxCard = this._createCard(w - 146, 16, 130, 68, 0x1a0d40, 0.9);
    c.addChild(maxCard);

    const maxLabel = new PIXI.Text({
      text: '最高', style: { fontFamily: 'Arial, sans-serif', fontSize: 11, fill: 0x9d88c8, letterSpacing: 1 },
    });
    maxLabel.anchor.set(1, 0);
    maxLabel.x = w - 24; maxLabel.y = 22;
    c.addChild(maxLabel);

    const maxText = new PIXI.Text({
      text: '2', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 22, fill: 0xffeb3b, stroke: { color: 0x000000, width: 3, alpha: 0.4 } },
    });
    maxText.anchor.set(1, 0);
    maxText.x = w - 24; maxText.y = 40;
    c.addChild(maxText);
    this._elements.maxText = maxText;

    // 最高数字卡片内倍率小标签
    const multInMax = new PIXI.Text({
      text: '', style: { fontSize: 10, fill: 0xffd54f, fontWeight: 'bold' },
    });
    multInMax.anchor.set(1, 1);
    multInMax.x = 130 - 10;
    multInMax.y = 68 - 6;
    maxCard.addChild(multInMax);
    this._elements.multInMax = multInMax;

    // 金币徽章
    const coinBg = new PIXI.Graphics();
    coinBg.roundRect(w - 86, 8, 70, 24, 12);
    coinBg.fill({ color: 0x2b1855, alpha: 0.8 });
    coinBg.stroke({ color: 0x6c47b0, width: 1, alpha: 0.5 });
    c.addChild(coinBg);

    const coinText = new PIXI.Text({
      text: '0', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 13, fill: 0xffd54f },
    });
    coinText.anchor.set(1, 0.5);
    coinText.x = w - 28; coinText.y = 20;
    c.addChild(coinText);
    this._elements.coinText = coinText;

    const coinIcon = new PIXI.Text({ text: '✦', style: { fontSize: 16, fill: 0xffd54f } });
    coinIcon.x = w - 80; coinIcon.y = 10;
    c.addChild(coinIcon);

    // 按钮
    this._addIconButton(10, 10, '☰', 18);
    const soundBtn = this._addIconButton(w - 68, 10, '🔊', 16, () => { if (this._onSoundToggle) this._onSoundToggle(); });
    this._elements.soundLabel = soundBtn._label;
  }

  // ============= 任务面板（凸显版） =============
  _buildQuestPanel(w, y) {
    const c = this.container;
    const panelW = w - 28;
    const panelX = 14;
    const panelH = 88;

    // 背景
    const bg = new PIXI.Graphics();
    bg.roundRect(panelX, y, panelW, panelH, 14);
    bg.fill({ color: 0x150830, alpha: 0.96 });
    bg.stroke({ color: 0xffeb3b, width: 1.5, alpha: 0.35 });
    c.addChild(bg);

    // 标题悬浮
    const titleBg = new PIXI.Graphics();
    titleBg.rect(panelX + 12, y - 8, 56, 16);
    titleBg.fill({ color: 0x0d0618 });
    c.addChild(titleBg);

    const title = new PIXI.Text({
      text: '本局目标', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 11, fill: 0xffeb3b, letterSpacing: 1 },
    });
    title.x = panelX + 16;
    title.y = y - 7;
    c.addChild(title);

    // 三个任务卡片
    const padding = 12;
    const gap = 8;
    const chipH = panelH - padding * 2;
    const chipY = y + padding;
    const availW = panelW - padding * 2;
    const chipW = (availW - gap * 2) / 3;

    this._elements.questChips = [];

    for (let i = 0; i < 3; i++) {
      const chipX = panelX + padding + i * (chipW + gap);
      const chipContainer = new PIXI.Container();
      chipContainer.x = chipX;
      chipContainer.y = chipY;
      c.addChild(chipContainer);

      // 卡片背景
      const chipBg = new PIXI.Graphics();
      chipBg.roundRect(0, 0, chipW, chipH, 10);
      chipBg.fill({ color: 0x1a0d40 });
      chipBg.stroke({ color: 0x4a2f80, width: 1, alpha: 0.4 });
      chipContainer.addChild(chipBg);

      // 图标圆圈
      const iconCircle = new PIXI.Graphics();
      iconCircle.circle(chipW / 2, 18, 13);
      iconCircle.fill({ color: 0x3b2b70 });
      chipContainer.addChild(iconCircle);

      const iconText = new PIXI.Text({ text: '?', style: { fontSize: 14, fill: 0xffffff } });
      iconText.anchor.set(0.5);
      iconText.x = chipW / 2; iconText.y = 18;
      chipContainer.addChild(iconText);

      // 任务文字
      const questText = new PIXI.Text({
        text: '', style: { fontFamily: 'Arial, sans-serif', fontSize: 9, fill: 0xb8a4d8, align: 'center', lineHeight: 13 },
      });
      questText.anchor.set(0.5, 0);
      questText.x = chipW / 2; questText.y = 36;
      chipContainer.addChild(questText);

      // 奖励
      const rewardText = new PIXI.Text({
        text: '', style: { fontSize: 9, fill: 0xffd54f },
      });
      rewardText.anchor.set(0.5, 0);
      rewardText.x = chipW / 2; rewardText.y = chipH - 16;
      chipContainer.addChild(rewardText);

      this._elements.questChips.push({
        container: chipContainer, bg: chipBg, iconCircle, iconText, text: questText, reward: rewardText,
      });
    }
  }

  // ============= 道具按钮 =============
  _buildItemButtons(w, y) {
    const c = this.container;
    const btnW = 120;
    const btnH = 52;
    const gap = 10;
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
      container.x = x; container.y = y;
      container.eventMode = 'static'; container.cursor = 'pointer';

      const shadow = new PIXI.Graphics();
      shadow.roundRect(2, 4, btnW, btnH, 12);
      shadow.fill({ color: item.shadow, alpha: 0.6 });
      container.addChild(shadow);

      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, btnW, btnH, 12);
      bg.fill({ color: item.color });
      bg.beginPath();
      bg.arc(btnW / 2, btnH / 2, btnW / 2, Math.PI, 0);
      bg.lineTo(btnW, 0); bg.lineTo(0, 0); bg.closePath();
      bg.fill({ color: 0xffffff, alpha: 0.15 });
      container.addChild(bg);

      const icon = new PIXI.Text({ text: item.icon, style: { fontSize: 20, fill: 0xffffff } });
      icon.anchor.set(0.5, 0); icon.x = btnW / 2; icon.y = 6;
      container.addChild(icon);

      const label = new PIXI.Text({
        text: item.label, style: { fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: 12, fill: 0xffffff },
      });
      label.anchor.set(0.5, 0); label.x = btnW / 2; label.y = 28;
      container.addChild(label);

      const countText = new PIXI.Text({
        text: '1 次', style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: 0xd4c8ff },
      });
      countText.anchor.set(0.5, 0); countText.x = btnW / 2; countText.y = 45;
      container.addChild(countText);

      container.on('pointerdown', () => { shadow.y = 2; bg.y = -2; icon.y = 4; label.y = 26; countText.y = 43; });
      container.on('pointerup', () => { shadow.y = 4; bg.y = 0; icon.y = 6; label.y = 28; countText.y = 45; if (this._onItemClick) this._onItemClick(item.key); });
      container.on('pointerupoutside', () => { shadow.y = 4; bg.y = 0; icon.y = 6; label.y = 28; countText.y = 45; });
      shadow.y = 4;

      c.addChild(container);
      this._elements.itemButtons[item.key] = { container, bg, shadow, countText };
    });
  }

  // ============= 底部装饰 =============
  _buildBottomDecoration(w) {
    const glow = new PIXI.Graphics();
    const grad = new PIXI.FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: w, y: 0 },
      colorStops: [
        { offset: 0, color: 0x6c47b0, alpha: 0 },
        { offset: 0.5, color: 0x6c47b0, alpha: 0.08 },
        { offset: 1, color: 0x6c47b0, alpha: 0 },
      ],
      textureSpace: 'global',
    });
    glow.rect(0, this.designHeight - 36, w, 36);
    glow.fill(grad);
    this.container.addChild(glow);

    const version = new PIXI.Text({
      text: '星图能量网 · 点击同色连通块合并',
      style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: 0x4a3a6a },
    });
    version.anchor.set(0.5, 0);
    version.x = w / 2;
    version.y = this.designHeight - 20;
    this.container.addChild(version);
  }

  // ============= 辅助 =============
  _createCard(x, y, w, h, color, alpha) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;
    const shadow = new PIXI.Graphics();
    shadow.roundRect(2, 3, w, h, 14);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    c.addChild(shadow);
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, 14);
    bg.fill({ color, alpha });
    bg.stroke({ color: 0x6040b0, width: 1.5, alpha: 0.3 });
    c.addChild(bg);
    const hi = new PIXI.Graphics();
    hi.roundRect(0, 0, w, 20, 14);
    hi.fill({ color: 0xffffff, alpha: 0.06 });
    c.addChild(hi);
    return c;
  }

  _addIconButton(x, y, icon, size, onClick) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;
    if (onClick) { c.eventMode = 'static'; c.cursor = 'pointer'; }
    const btn = new PIXI.Graphics();
    btn.roundRect(0, 0, 32, 32, 10);
    btn.fill({ color: 0x2b1855, alpha: 0.7 });
    btn.stroke({ color: 0x6c47b0, width: 1, alpha: 0.4 });
    c.addChild(btn);
    const t = new PIXI.Text({ text: icon, style: { fontSize: size, fill: 0xd4c8ff } });
    t.anchor.set(0.5); t.x = 16; t.y = 16;
    c.addChild(t);
    c._label = t;
    if (onClick) {
      c.on('pointerdown', () => btn.fill({ color: 0x1a0a40, alpha: 0.9 }));
      c.on('pointerup', () => { btn.fill({ color: 0x2b1855, alpha: 0.7 }); onClick(); });
      c.on('pointerupoutside', () => btn.fill({ color: 0x2b1855, alpha: 0.7 }));
    }
    this.container.addChild(c);
    return c;
  }

  // ============= 状态更新 =============
  update(state) {
    if (this._lastScore !== state.score) {
      this._animateScoreChange();
      this._lastScore = state.score;
    }
    this._elements.scoreText.text = state.score.toLocaleString();
    this._elements.maxText.text = state.maxTile.toString();
    this._elements.coinText.text = state.economy.coins.toString();

    // 连击显示（整合进卡片）
    const combo = state.combo.count;
    if (combo >= 2) {
      this._elements.comboInScore.text = `×${combo}`;
      const mult = this._comboMult(combo);
      this._elements.multInMax.text = `×${mult.toFixed(2)}`;
    } else {
      this._elements.comboInScore.text = '';
      this._elements.multInMax.text = '';
    }

    // 道具
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
        btn._noUseGlow.roundRect(-1, -1, 122, 54, 13);
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

  _comboMult(count) {
    if (count >= 12) return 1.7;
    if (count >= 8) return 1.45;
    if (count >= 5) return 1.25;
    if (count >= 3) return 1.1;
    return 1.0;
  }

  _animateScoreChange() {
    const t = this._elements.scoreText;
    if (!t) return;
    const baseY = 38;
    const start = performance.now();
    const tick = () => {
      const p = Math.min((performance.now() - start) / 300, 1);
      t.y = baseY - Math.sin(p * Math.PI) * 6;
      t.style.fill = p < 0.3 ? 0xffd54f : 0xffffff;
      if (p < 1) requestAnimationFrame(tick);
      else t.y = baseY;
    };
    tick();
  }

  _updateQuests(state) {
    const quests = state.quest.getActiveWithStatus().slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const chip = this._elements.questChips?.[i];
      if (!chip) continue;
      const q = quests[i];
      if (!q) { chip.container.visible = false; continue; }
      chip.container.visible = true;

      // 图标
      chip.iconText.text = q.completed ? '✓' : (QUEST_ICONS[q.id] || '◎');

      // 文字
      chip.text.text = q.desc;

      // 奖励
      chip.reward.text = `+${q.reward}✦`;

      // 样式
      if (q.completed) {
        chip.bg.clear();
        chip.bg.roundRect(0, 0, chip.bg.width || 118, chip.bg.height || 64, 10);
        chip.bg.fill({ color: 0x1a0d40 });
        chip.bg.stroke({ color: 0x66bb6a, width: 1.5, alpha: 0.5 });
        chip.iconCircle.clear();
        chip.iconCircle.circle(chip.iconText.x, 18, 13);
        chip.iconCircle.fill({ color: 0x66bb6a });
        chip.text.style.fill = 0x88ddaa;
      } else {
        chip.bg.clear();
        chip.bg.roundRect(0, 0, chip.bg.width || 118, chip.bg.height || 64, 10);
        chip.bg.fill({ color: 0x1a0d40 });
        chip.bg.stroke({ color: 0x4a2f80, width: 1, alpha: 0.4 });
        chip.iconCircle.clear();
        chip.iconCircle.circle(chip.iconText.x, 18, 13);
        chip.iconCircle.fill({ color: 0x3b2b70 });
        chip.text.style.fill = 0xb8a4d8;
      }
    }
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
    panel.alpha = 0; panel.scale.set(0.8);
    this.container.addChild(panel);
    this._elements.resultPanel = panel;

    const startTime = performance.now();
    const enterAnim = () => {
      const t = Math.min((performance.now() - startTime) / 400, 1);
      const e = 1 - Math.pow(1 - t, 3);
      panel.alpha = e; panel.scale.set(0.8 + 0.2 * e);
      if (t >= 1) { panel.scale.set(1); this._buildResultContent(cx, cy, panelW, panelH, result, onNewGame); return; }
      requestAnimationFrame(enterAnim);
    };
    enterAnim();
  }

  _buildResultContent(cx, cy, panelW, panelH, result, onNewGame) {
    let titleText = '本局完成！'; let subtext = '';
    if (result.maxTile >= 2048) { titleText = '🎉 传奇合成！'; subtext = '2048 已达成！'; }
    else if (result.maxTile >= 512) { titleText = '🌟 了不起！'; subtext = '合成 512+！'; }
    else if (result.maxTile >= 128) { titleText = '✨ 干得漂亮！'; subtext = '合成 128+！'; }
    else if (result.score > 5000) { titleText = '🔥 高分！'; subtext = '继续挑战吧'; }

    const title = new PIXI.Text({
      text: titleText, style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 28, fill: 0xffd54f, stroke: { color: 0x000000, width: 3, alpha: 0.4 } },
    });
    title.anchor.set(0.5, 0); title.x = cx; title.y = cy - panelH / 2 + 30;
    this.container.addChild(title);

    if (subtext) {
      const sub = new PIXI.Text({ text: subtext, style: { fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0xb8a4d8 } });
      sub.anchor.set(0.5, 0); sub.x = cx; sub.y = cy - panelH / 2 + 66;
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
      const label = new PIXI.Text({ text: s.label, style: { fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x9d88c8 } });
      label.anchor.set(0.5, 0); label.x = cx; label.y = statsStartY + i * 42;
      this.container.addChild(label);
      const val = new PIXI.Text({ text: s.value, style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 22, fill: s.color } });
      val.anchor.set(0.5, 0); val.x = cx; val.y = statsStartY + 18 + i * 42;
      this.container.addChild(val);
    });

    const divider = new PIXI.Graphics();
    divider.rect(cx - 100, statsStartY + stats.length * 42 + 10, 200, 1);
    divider.fill({ color: 0x4a2f80, alpha: 0.5 });
    this.container.addChild(divider);

    const rewardY = statsStartY + stats.length * 42 + 24;
    const coinLabel = new PIXI.Text({ text: '获得金币', style: { fontFamily: 'Arial, sans-serif', fontSize: 13, fill: 0x9d88c8 } });
    coinLabel.anchor.set(0.5, 0); coinLabel.x = cx; coinLabel.y = rewardY;
    this.container.addChild(coinLabel);

    const coinVal = new PIXI.Text({
      text: `+ ${result.coins || 20} ✦`, style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 24, fill: 0xffd54f },
    });
    coinVal.anchor.set(0.5, 0); coinVal.x = cx; coinVal.y = rewardY + 22;
    this.container.addChild(coinVal);

    const btnW = 200; const btnH = 54; const btnY = cy + panelH / 2 - btnH - 22;
    const btnShadow = new PIXI.Graphics();
    btnShadow.roundRect(cx - btnW / 2 + 2, btnY + 5, btnW, btnH, 16);
    btnShadow.fill({ color: 0x306020, alpha: 0.7 });
    this.container.addChild(btnShadow);

    const btn = new PIXI.Graphics();
    btn.roundRect(cx - btnW / 2, btnY, btnW, btnH, 16);
    const btnGrad = new PIXI.FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: btnH },
      colorStops: [{ offset: 0, color: 0x5cbf60 }, { offset: 1, color: 0x3a9f40 }],
      textureSpace: 'local',
    });
    btn.fill(btnGrad);
    btn.beginPath(); btn.arc(cx, btnY, btnW / 2, Math.PI, 0);
    btn.lineTo(cx + btnW / 2, btnY); btn.lineTo(cx - btnW / 2, btnY); btn.closePath();
    btn.fill({ color: 0xffffff, alpha: 0.2 });
    btn.eventMode = 'static'; btn.cursor = 'pointer';
    this.container.addChild(btn);

    const btnText = new PIXI.Text({
      text: '再来一局', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: '900', fontSize: 20, fill: 0xffffff, stroke: { color: 0x000000, width: 2, alpha: 0.3 } },
    });
    btnText.anchor.set(0.5, 0.5); btnText.x = cx; btnText.y = btnY + btnH / 2;
    this.container.addChild(btnText);

    btn.on('pointerdown', () => { btnShadow.y = 2; btn.y = 2; btnText.y = btnY + btnH / 2 + 2; });
    btn.on('pointerup', () => { btnShadow.y = 0; btn.y = 0; btnText.y = btnY + btnH / 2; this._clearResult(() => { if (onNewGame) onNewGame(); }); });
    btn.on('pointerupoutside', () => { btnShadow.y = 0; btn.y = 0; btnText.y = btnY + btnH / 2; });
  }

  _clearResult(callback) {
    ['resultOverlay', 'resultPanel'].forEach(k => {
      const el = this._elements[k];
      if (el && el.parent) { el.parent.removeChild(el); el.destroy({ children: true }); }
      delete this._elements[k];
    });
    if (callback) callback();
  }
}
