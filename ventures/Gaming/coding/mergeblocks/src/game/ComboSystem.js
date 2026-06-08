// ============================================================
// ComboSystem — 连击追踪与倍率
// ============================================================

import { getComboMultiplier } from './config.js';

export class ComboSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.count = 0;
  }

  /** 记录一次有效合并 */
  recordMerge() {
    this.count++;
  }

  /** 使用道具清零 */
  clearByItem() {
    this.count = 0;
  }

  /** 获取当前倍率 */
  get currentMultiplier() {
    return getComboMultiplier(this.count);
  }

  /** 获取连击等级描述 */
  get level() {
    if (this.count >= 12) return 'MAX';
    if (this.count >= 8) return 'HIGH';
    if (this.count >= 5) return 'MEDIUM';
    if (this.count >= 3) return 'LOW';
    return 'NONE';
  }

  getSnapshot() {
    return { count: this.count };
  }

  loadSnapshot(snap) {
    this.count = snap.count;
  }
}
