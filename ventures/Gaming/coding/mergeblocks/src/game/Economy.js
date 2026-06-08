// ============================================================
// Economy — 金币经济系统
// ============================================================

import { COIN_REWARDS } from './config.js';

export class Economy {
  constructor() {
    this.coins = 0;
  }

  addCoins(amount) {
    this.coins += amount;
    return this.coins;
  }

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
  }

  get balance() {
    return this.coins;
  }

  /** 结算金币奖励 */
  calculateGameReward(stats) {
    let reward = COIN_REWARDS.gameComplete;
    if (stats.maxTile >= 512) reward += COIN_REWARDS.reach512;
    if (stats.maxTile >= 2048) reward += COIN_REWARDS.reach2048;
    return reward;
  }
}
