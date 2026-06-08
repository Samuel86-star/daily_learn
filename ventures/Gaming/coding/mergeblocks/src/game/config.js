// ============================================================
// 星图能量网 - 游戏配置常数
// ============================================================

export const BOARD_WIDTH = 6;
export const BOARD_HEIGHT = 6;
export const BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT;

export const MIN_MERGE_GROUP = 2;
export const TARGET_VALUE_HINT = 2048;

export const POWERS_OF_TWO = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

// ---- 组大小 → bonus_rank ----
export const GROUP_BONUS_RANK = {
  2: 0, 3: 0, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3,
};
export function getBonusRank(groupSize) {
  if (groupSize >= 12) return 4;
  return GROUP_BONUS_RANK[groupSize] ?? 0;
}

// ---- 组大小 → 分数倍率 ----
export const GROUP_SCORE_MULTIPLIER = {
  2: 1.0, 3: 1.2, 4: 1.6, 5: 2.0, 6: 2.6, 7: 3.4, 8: 3.4, 9: 4.5, 10: 4.5, 11: 4.5,
};
export function getScoreMultiplier(groupSize) {
  if (groupSize >= 12) return 6.0;
  return GROUP_SCORE_MULTIPLIER[groupSize] ?? 1.0;
}

// ---- Combo 倍率 ----
export const COMBO_MULTIPLIER = [
  { min: 1, max: 2, mult: 1.0 },
  { min: 3, max: 4, mult: 1.1 },
  { min: 5, max: 7, mult: 1.25 },
  { min: 8, max: 11, mult: 1.45 },
  { min: 12, max: Infinity, mult: 1.7 },
];
export function getComboMultiplier(combo) {
  for (const e of COMBO_MULTIPLIER) if (combo >= e.min && combo <= e.max) return e.mult;
  return 1.0;
}

// ---- 新块权重 ----
export const NEW_TILE_WEIGHTS = [
  { maxTile: 64, values: [2, 4, 8], weights: [55, 35, 10] },
  { maxTile: 512, values: [2, 4, 8, 16], weights: [45, 35, 15, 5] },
  { maxTile: Infinity, values: [2, 4, 8, 16, 32], weights: [38, 32, 18, 9, 3] },
];
export function getTileWeights(currentMaxTile) {
  for (const t of NEW_TILE_WEIGHTS) if (currentMaxTile <= t.maxTile) return t;
  return NEW_TILE_WEIGHTS[NEW_TILE_WEIGHTS.length - 1];
}

// ---- 道具 ----
export const ITEM_PRICES = { undo: 80, hammer: 120, shuffle: 160 };
export const FREE_ITEMS_PER_GAME = { undo: 1, hammer: 1, shuffle: 1 };

export const COIN_REWARDS = {
  gameComplete: 20, reach512: 20, reach2048: 80,
  questNormal: 50, questAdvanced: 100, adMultiplier: 2,
};

export const MIN_STARTING_GROUPS = 5;
export const MAX_STARTING_TILE = 8;
export const MAX_REROLL_ATTEMPTS = 3;

// ============================================================
// 主题：深紫宇宙渐变 + 糖果色相轮转
// ============================================================
export const COLORS = {
  background: 0x1a0b3a,           // 顶层深紫
  backgroundDark: 0x08041a,       // 底层深黑紫
  gridLine: 0x2a1850,             // 棋盘背景框
  tileEmpty: 0x231445,            // 空格底色
  tileText: 0xffffff,
  tileTextStroke: 0x000000,
  scoreText: 0xffffff,
  scoreLabel: 0xb8a4d4,           // 标签灰紫
  coinText: 0xffd54f,
  panelBg: 0x150830,
  panelBorder: 0x4a2f80,
  highlightGlow: 0xffeb3b,        // 黄色描边表示高亮选中
};

// ---- 糖果色相轮转配色 ----
// 每阶用完全不同的色相，符合 2048 玩家的视觉惯例
export const TILE_COLORS = {
  2:    { bg: 0xee5a8a, hi: 0xff8db0, text: 0xffffff },   // 粉红
  4:    { bg: 0xa855f7, hi: 0xc788ff, text: 0xffffff },   // 紫
  8:    { bg: 0x4f7df5, hi: 0x7da3ff, text: 0xffffff },   // 蓝
  16:   { bg: 0x29b6f6, hi: 0x66d5ff, text: 0xffffff },   // 天青
  32:   { bg: 0x26a69a, hi: 0x5dd4c6, text: 0xffffff },   // 青绿
  64:   { bg: 0x66bb6a, hi: 0x9eda9d, text: 0xffffff },   // 绿
  128:  { bg: 0xfdd835, hi: 0xfff176, text: 0x4a3500 },   // 黄
  256:  { bg: 0xffa726, hi: 0xffcb70, text: 0x4a2500 },   // 橙
  512:  { bg: 0xff7043, hi: 0xff9b78, text: 0xffffff },   // 橘红
  1024: { bg: 0xef5350, hi: 0xff8585, text: 0xffffff },   // 红
  2048: { bg: 0xec407a, hi: 0xff85a8, text: 0xffffff },   // 玫红
  4096: { bg: 0xab47bc, hi: 0xd48be0, text: 0xffffff },   // 深紫
  8192: { bg: 0x7e57c2, hi: 0xae87e8, text: 0xffffff },   // 蓝紫
  16384:{ bg: 0x5c6bc0, hi: 0x8b97e0, text: 0xffffff },   // 靛蓝
};

export function getTileColor(value) {
  return TILE_COLORS[value] || { bg: 0xffffff, hi: 0xffffff, text: 0x000000 };
}
