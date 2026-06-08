// ============================================================
// TutorialManager — 新手引导系统
// 用 localStorage 记录"已看过"，避免反复打扰
// ============================================================

import * as PIXI from 'pixi.js';
import { MergeEngine } from '../game/MergeEngine.js';

const STORAGE_KEY = 'mb_tutorial_state_v1';

export class TutorialManager {
  /**
   * @param {PIXI.Container} root - UI root（设计坐标）
   * @param {number} designWidth
   * @param {number} designHeight
   * @param {object} layout
   * @param {number} cellSize
   * @param {number} gap
   */
  constructor(root, designWidth, designHeight, layout, cellSize, gap) {
    this.root = root;
    this.designWidth = designWidth;
    this.designHeight = designHeight;
    this.layout = layout;
    this.cellSize = cellSize;
    this.gap = gap;

    this.container = new PIXI.Container();
    this.container.zIndex = 9999;
    root.addChild(this.container);

    this._state = this._loadState();
    this._activeStep = null;
    this._dismissCallback = null;
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      seenFirstMerge: false,       // 引导：点击第一组
      seenBigGroupHint: false,     // 提示：组越大越赚
      seenFirstCombo: false,       // 首次 Combo 提示
      seenFirstDeadlock: false,    // 首次死局提示
      seenItemHint: false,         // 道具按钮提示
    };
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (e) {}
  }

  isFirstTime() {
    return !this._state.seenFirstMerge;
  }

  /** 是否有正在显示的引导 */
  get isActive() {
    return this._activeStep !== null;
  }
}

// ============================================================
// 引导步骤 — TutorialManager 原型扩展
// ============================================================

Object.assign(TutorialManager.prototype, {

  /**
   * 引导步骤 1：首次进入游戏，找一个 2+ 同色组高亮，画手指 + 提示
   * @param {GameState} gameState
   * @returns {boolean} 是否成功显示
   */
  showFirstMergeGuide(gameState) {
    if (this._state.seenFirstMerge) return false;
    if (this.isActive) return false;

    // 找一个 size >= 2 的连通组（优先大的）
    const groups = MergeEngine.findAllGroups(gameState.board);
    if (!groups.length) return false;
    const target = groups[0]; // 已按 size 降序

    this._showHighlightGuide({
      group: target.group,
      title: '点一下',
      message: `点击相同数字的连通块\n它们会合并成更大的数字`,
      onDismiss: () => {
        this._state.seenFirstMerge = true;
        this._saveState();
      },
    });
    return true;
  },

  /**
   * 引导步骤 2：玩家第一次合并完成后，告诉他组越大越值
   */
  showBigGroupHint() {
    if (this._state.seenBigGroupHint) return false;
    if (this.isActive) return false;
    this._showTextBubble({
      title: '组越大越赚',
      message: '4 块以上的合并\n会奖励额外升级 + 分数倍率',
      duration: 3500,
      onDismiss: () => {
        this._state.seenBigGroupHint = true;
        this._saveState();
      },
    });
    return true;
  },

  /**
   * 引导：首次 Combo
   */
  showComboHint() {
    if (this._state.seenFirstCombo) return false;
    if (this.isActive) return false;
    this._showTextBubble({
      title: '连击触发',
      message: '连续合并积累连击\n最高 ×1.7 分数加成',
      duration: 3000,
      onDismiss: () => {
        this._state.seenFirstCombo = true;
        this._saveState();
      },
    });
    return true;
  },

  /**
   * 引导：首次遇到死局
   */
  showDeadlockHint() {
    if (this._state.seenFirstDeadlock) return false;
    if (this.isActive) return false;
    this._showTextBubble({
      title: '没有可合并的了',
      message: '可以用底部"重排"道具\n打散棋盘重新开始',
      duration: 4000,
      onDismiss: () => {
        this._state.seenFirstDeadlock = true;
        this._saveState();
      },
    });
    return true;
  },

  /**
   * 用户首次玩到中段，提示底部道具
   */
  showItemHint() {
    if (this._state.seenItemHint) return false;
    if (this.isActive) return false;
    this._showTextBubble({
      title: '三种救场道具',
      message: '撤销 · 消除 · 重排\n每局各送 1 次免费使用',
      duration: 3500,
      onDismiss: () => {
        this._state.seenItemHint = true;
        this._saveState();
      },
    });
    return true;
  },

  /** 重置（调试用） */
  reset() {
    this._state = {
      seenFirstMerge: false,
      seenBigGroupHint: false,
      seenFirstCombo: false,
      seenFirstDeadlock: false,
      seenItemHint: false,
    };
    this._saveState();
    this._dismiss();
  },
});

// ============================================================
// 渲染实现
// ============================================================

Object.assign(TutorialManager.prototype, {

  /** 高亮指定连通组 + 显示气泡 + 跳动手指 */
  _showHighlightGuide({ group, title, message, onDismiss }) {
    this._activeStep = 'highlight';
    this._dismissCallback = onDismiss;
    this.container.removeChildren();

    // 半透明遮罩（覆盖全屏）
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, this.designWidth, this.designHeight);
    overlay.fill({ color: 0x000000, alpha: 0.55 });
    overlay.hitArea = new PIXI.Rectangle(0, 0, this.designWidth, this.designHeight);
    overlay.eventMode = 'static';
    overlay.cursor = 'pointer';
    this.container.addChild(overlay);

    // 在遮罩上"挖洞"显示要点击的格子（用反向模板）
    // PIXI v8 简化做法：把高亮组的位置画上明亮边框 + 透明洞
    // 我们用更简单的方式：在每个高亮 cell 上画一个带光晕的边框
    const ringContainer = new PIXI.Container();
    this.container.addChild(ringContainer);

    for (const cell of group) {
      const px = this.layout.boardMarginX + this.gap + cell.col * (this.cellSize + this.gap);
      const py = this.layout.boardMarginTop + this.gap + cell.row * (this.cellSize + this.gap);

      // 反挖：用 BLEND_MODES 不可靠，改用半透明蒙板替代
      // 在格子位置上覆盖一个空透明区域用来吸引注意
      const hole = new PIXI.Graphics();
      hole.roundRect(px - 2, py - 2, this.cellSize + 4, this.cellSize + 4, this.cellSize * 0.22 + 2);
      hole.fill({ color: 0xffeb3b, alpha: 0.08 });
      hole.stroke({ color: 0xffeb3b, width: 2, alpha: 0.7 });
      ringContainer.addChild(hole);
    }

    // 在第一个 cell 上画跳动手指
    const firstCell = group[0];
    const fx = this.layout.boardMarginX + this.gap + firstCell.col * (this.cellSize + this.gap) + this.cellSize / 2;
    const fy = this.layout.boardMarginTop + this.gap + firstCell.row * (this.cellSize + this.gap) + this.cellSize / 2;

    const finger = new PIXI.Text({
      text: '👆',
      style: { fontSize: 56 },
    });
    finger.anchor.set(0.5, 0);
    finger.x = fx;
    finger.y = fy + 10;
    this.container.addChild(finger);

    // 手指上下跳动
    const baseY = finger.y;
    let elapsed = 0;
    const animTicker = (ticker) => {
      elapsed += ticker.deltaMS;
      finger.y = baseY + Math.sin(elapsed / 200) * 6;
    };
    // 缓存 ticker 用于清理
    this._fingerTicker = animTicker;

    // 用 setInterval 替代 (PIXI ticker 与 app 解耦更安全)
    this._fingerInterval = setInterval(() => {
      elapsed += 16;
      finger.y = baseY + Math.sin(elapsed / 200) * 6;
    }, 16);

    // 提示气泡（顶部居中）
    this._renderBubble(title, message, this.designHeight / 2 - 180);

    // 点击遮罩或棋盘任意处都关闭引导
    overlay.on('pointerdown', () => this._dismiss());
  },

  /** 文字气泡（无高亮，自动消失） */
  _showTextBubble({ title, message, duration = 3000, onDismiss }) {
    this._activeStep = 'bubble';
    this._dismissCallback = onDismiss;
    this.container.removeChildren();

    // 顶部居中气泡（不阻塞输入）
    this._renderBubble(title, message, 130);

    // 自动消失
    this._autoDismissTimer = setTimeout(() => {
      this._dismiss();
    }, duration);
  },

  _renderBubble(title, message, y) {
    const cx = this.designWidth / 2;
    const w = 280;
    const h = 100;

    // 气泡背景
    const bubble = new PIXI.Graphics();
    bubble.roundRect(cx - w / 2, y, w, h, 14);
    bubble.fill({ color: 0x2a1850, alpha: 0.96 });
    bubble.stroke({ color: 0xffeb3b, width: 2, alpha: 0.85 });
    this.container.addChild(bubble);

    // 标题
    const t = new PIXI.Text({
      text: title,
      style: {
        fontFamily: 'Arial Black, sans-serif',
        fontWeight: '900',
        fontSize: 18,
        fill: 0xffeb3b,
        stroke: { color: 0x000000, width: 2, alpha: 0.4 },
      },
    });
    t.anchor.set(0.5, 0);
    t.x = cx;
    t.y = y + 10;
    this.container.addChild(t);

    // 正文
    const m = new PIXI.Text({
      text: message,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 14,
        fill: 0xe0d8ff,
        align: 'center',
        lineHeight: 20,
      },
    });
    m.anchor.set(0.5, 0);
    m.x = cx;
    m.y = y + 38;
    this.container.addChild(m);
  },

  _dismiss() {
    if (this._fingerInterval) {
      clearInterval(this._fingerInterval);
      this._fingerInterval = null;
    }
    if (this._autoDismissTimer) {
      clearTimeout(this._autoDismissTimer);
      this._autoDismissTimer = null;
    }
    this.container.removeChildren();
    this._activeStep = null;
    const cb = this._dismissCallback;
    this._dismissCallback = null;
    if (cb) cb();
  },

  destroy() {
    this._dismiss();
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  },
});
