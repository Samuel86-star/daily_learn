// ============================================================
// 星图能量网 — 2048 Merge Blocks (PixiJS v8) 主入口
// ============================================================

import * as PIXI from 'pixi.js';
import { GameState } from './game/GameState.js';
import { MergeEngine } from './game/MergeEngine.js';
import { BoardRenderer } from './render/BoardRenderer.js';
import { TileRenderer } from './render/TileRenderer.js';
import { AnimationManager } from './render/AnimationManager.js';
import { UIManager } from './render/UIManager.js';
import { InputHandler } from './render/InputHandler.js';
import { BackgroundRenderer } from './render/BackgroundRenderer.js';
import { TutorialManager } from './tutorial/TutorialManager.js';
import { sound } from './audio/SoundManager.js';
import { BOARD_WIDTH, BOARD_HEIGHT, COLORS } from './game/config.js';

const DESIGN_WIDTH = 430;
const DESIGN_HEIGHT = 932;
const LAYOUT = {
  boardMarginX: 14,
  boardMarginTop: 196,
};

async function init() {
  const boardAreaW = DESIGN_WIDTH - LAYOUT.boardMarginX * 2;
  const gap = 6;
  const cellSize = Math.floor((boardAreaW - gap * (BOARD_WIDTH + 1)) / BOARD_WIDTH);
  const boardW = BOARD_WIDTH * cellSize + (BOARD_WIDTH + 1) * gap;
  const boardH = BOARD_HEIGHT * cellSize + (BOARD_HEIGHT + 1) * gap;

  const scale = Math.min(
    window.innerWidth / DESIGN_WIDTH,
    window.innerHeight / DESIGN_HEIGHT
  );
  const actualW = Math.floor(DESIGN_WIDTH * scale);
  const actualH = Math.floor(DESIGN_HEIGHT * scale);

  const app = new PIXI.Application();
  await app.init({
    width: actualW, height: actualH,
    backgroundColor: COLORS.background,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  document.getElementById('game-container').appendChild(app.canvas);

  const root = new PIXI.Container();
  root.scale.set(scale);
  app.stage.addChild(root);

  // 背景（带动画粒子）
  const bgRenderer = new BackgroundRenderer(DESIGN_WIDTH, DESIGN_HEIGHT);
  root.addChild(bgRenderer.container);

  // 棋盘容器
  const boardContainer = new PIXI.Container();
  boardContainer.x = LAYOUT.boardMarginX;
  boardContainer.y = LAYOUT.boardMarginTop;
  root.addChild(boardContainer);

  // 游戏核心
  const gameState = new GameState();
  const boardRenderer = new BoardRenderer(boardContainer, cellSize, gap);
  const tileRenderer = new TileRenderer(boardContainer, cellSize, gap);

  // 粒子层（屏幕坐标，不被缩放）
  const particleLayer = new PIXI.Container();
  app.stage.addChild(particleLayer);

  const animManager = new AnimationManager(app, scale, LAYOUT, particleLayer);
  const uiManager = new UIManager(root, DESIGN_WIDTH, DESIGN_HEIGHT, LAYOUT);
  uiManager.build(boardW, boardH);

  // 新手引导
  const tutorial = new TutorialManager(root, DESIGN_WIDTH, DESIGN_HEIGHT, LAYOUT, cellSize, gap);

  // 输入锁
  let inputLocked = false;
  let hasMergedOnce = false;
  let hasComboShown = false;

  // ---- 音频初始化 ----
  let audioInited = false;
  const ensureAudio = () => {
    if (!audioInited) {
      sound.init();
      audioInited = true;
    }
  };
  document.addEventListener('pointerdown', ensureAudio, { once: true });
  document.addEventListener('touchstart', ensureAudio, { once: true });
  document.addEventListener('keydown', ensureAudio, { once: true });

  // ---- 静音切换 ----
  let muted = false;
  const toggleMute = () => {
    muted = !muted;
    sound.setMuted(muted);
    uiManager.setSoundMuted(muted);
  };

  // ---- 游戏回调 ----
  gameState.onQuestComplete = (quest) => {
    sound.questComplete();
    console.log(`✓ 任务完成: ${quest.desc} +${quest.reward}✦`);
  };

  // ---- 主输入处理 ----
  const handleTap = async (row, col) => {
    if (inputLocked || gameState.gameOver) return;

    ensureAudio();

    const tile = gameState.board.get(row, col);
    if (!tile) return;

    const group = MergeEngine.findConnectedGroup(gameState.board, row, col);
    if (!group) {
      sound.invalid();
      const sprite = tileRenderer.getTileSprite(tile.id);
      if (sprite) animManager.playInvalidFeedback(sprite);
      return;
    }

    inputLocked = true;
    sound.click();

    // 短暂高亮
    tileRenderer.highlightGroup(group, gameState.board);
    await new Promise(r => setTimeout(r, 80));
    tileRenderer.clearHighlight();

    // 执行合并
    const timeline = gameState.tap(row, col);
    if (!timeline) {
      inputLocked = false;
      return;
    }

    // 合并音效
    sound.merge(timeline.resultValue, timeline.groupSize);
    setTimeout(() => sound.upgrade(timeline.resultValue), 180);

    if (timeline.comboCount >= 2) {
      setTimeout(() => sound.combo(timeline.comboCount), 220);
    }
    if (timeline.groupSize >= 6) {
      setTimeout(() => sound.bigGroup(timeline.groupSize), 240);
    }

    // 播放动画时间线
    await animManager.playMergeTimeline(timeline, tileRenderer, gameState.board);

    uiManager.update(gameState);

    // 首次合并 → 引导
    if (!hasMergedOnce) {
      hasMergedOnce = true;
      setTimeout(() => {
        if (tutorial.showBigGroupHint && !tutorial.isActive) {
          tutorial.showBigGroupHint();
        }
      }, 600);
    }

    if (!hasComboShown && timeline.comboCount >= 3) {
      hasComboShown = true;
      setTimeout(() => tutorial.showComboHint(), 800);
    }

    // 死局结算
    if (timeline.gameOver) {
      sound.gameOver();
      tutorial.showDeadlockHint?.();
      const result = gameState.getResult();
      gameState.collectReward();
      uiManager.update(gameState);
      await new Promise(r => setTimeout(r, 500));
      uiManager.showResult(result, () => {
        sound.buttonTap();
        gameState.newGame();
        tileRenderer.renderBoard(gameState.board);
        uiManager.update(gameState);
        inputLocked = false;
      });
      return;
    }

    inputLocked = false;
  };

  const inputHandler = new InputHandler(app, boardRenderer, tileRenderer, scale, LAYOUT, handleTap);

  // ---- 道具使用（有免费次数时） ----
  const useItem = (key) => {
    ensureAudio();
    sound.itemUse();
    switch (key) {
      case 'undo':
        gameState.useItem('undo');
        tileRenderer.renderBoard(gameState.board);
        uiManager.update(gameState);
        break;
      case 'hammer':
        for (let r = 0; r < BOARD_HEIGHT; r++) {
          for (let c = 0; c < BOARD_WIDTH; c++) {
            const t = gameState.board.get(r, c);
            if (t && t.value !== gameState.maxTile) {
              const result = gameState.useItem('hammer', r, c);
              if (result && result.used) {
                tileRenderer.renderBoard(gameState.board);
                uiManager.update(gameState);
                return;
              }
            }
          }
        }
        break;
      case 'shuffle':
        gameState.useItem('shuffle');
        tileRenderer.renderBoard(gameState.board);
        uiManager.update(gameState);
        break;
    }
  };

  uiManager.setOnSoundToggle(() => { toggleMute(); });
  uiManager.setOnItemClick((key) => {
    if (inputLocked || gameState.gameOver) return;
    useItem(key);
  });
  uiManager.setOnItemPurchase((key) => {
    if (inputLocked || gameState.gameOver) return;
    const ok = gameState.purchaseItem(key);
    if (ok) {
      sound.itemUse();
      useItem(key);
    } else {
      sound.invalid();
    }
  });

  // ---- 启动 ----
  gameState.newGame();
  tileRenderer.renderBoard(gameState.board);
  uiManager.update(gameState);

  // 首次进入展示引导
  setTimeout(() => {
    if (tutorial.isFirstTime()) {
      tutorial.showFirstMergeGuide(gameState);
    }
  }, 800);

  window.addEventListener('resize', () => {
    const s = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
    app.renderer.resize(Math.floor(DESIGN_WIDTH * s), Math.floor(DESIGN_HEIGHT * s));
    root.scale.set(s);
  });

  // 调试接口
  window.__game = gameState;
  window.__tutorial = tutorial;
  window.__sound = sound;
  console.log('星图能量网已启动 — 单击同色连通组直接合并');
}

init().catch(console.error);
