// ============================================================
// QuestSystem — 任务系统
// MVP 展示 1-3 个当前任务，每局最多刷新 1 个新任务
// ============================================================

import { COIN_REWARDS } from './config.js';

const QUEST_TEMPLATES = [
  {
    id: 'reach_128',
    desc: '合成 128',
    check: (stats) => stats.maxTile >= 128,
    reward: COIN_REWARDS.questNormal,
    type: 'milestone',
  },
  {
    id: 'reach_512',
    desc: '合成 512',
    check: (stats) => stats.maxTile >= 512,
    reward: COIN_REWARDS.questAdvanced,
    type: 'milestone',
  },
  {
    id: 'reach_2048',
    desc: '合成 2048',
    check: (stats) => stats.maxTile >= 2048,
    reward: COIN_REWARDS.questAdvanced,
    type: 'milestone',
  },
  {
    id: 'big_merge_4',
    desc: '完成 5 次 4 格以上合并',
    check: (stats) => stats.bigMergeCount4 >= 5,
    reward: COIN_REWARDS.questNormal,
    type: 'cumulative',
  },
  {
    id: 'big_merge_6',
    desc: '完成 3 次 6 格以上合并',
    check: (stats) => stats.bigMergeCount6 >= 3,
    reward: COIN_REWARDS.questAdvanced,
    type: 'cumulative',
  },
  {
    id: 'combo_8',
    desc: '单局达到 8 Combo',
    check: (stats) => stats.maxCombo >= 8,
    reward: COIN_REWARDS.questAdvanced,
    type: 'milestone',
  },
  {
    id: 'score_3000',
    desc: '获得 3000 分',
    check: (stats) => stats.score >= 3000,
    reward: COIN_REWARDS.questNormal,
    type: 'milestone',
  },
  {
    id: 'score_10000',
    desc: '获得 10000 分',
    check: (stats) => stats.score >= 10000,
    reward: COIN_REWARDS.questAdvanced,
    type: 'milestone',
  },
  {
    id: 'shuffle_use',
    desc: '使用 1 次重洗后继续合并 3 次',
    check: (stats) => stats.shuffleUsed && stats.mergesAfterShuffle >= 3,
    reward: COIN_REWARDS.questNormal,
    type: 'conditional',
  },
  {
    id: 'merge_10_times',
    desc: '合并 10 次',
    check: (stats) => stats.totalMerges >= 10,
    reward: COIN_REWARDS.questNormal,
    type: 'cumulative',
  },
];

export class QuestSystem {
  constructor() {
    this.activeQuests = [];    // 当前任务
    this.completedIds = new Set();   // 已完成的任务 ID
    this.maxActive = 3;
  }

  reset() {
    this.completedIds.clear();
    this._generateQuests();
  }

  /** 新一局时刷新任务（保留未完成的） */
  newGame() {
    // 清除已完成但未移除的
    this.activeQuests = this.activeQuests.filter(q => !this.completedIds.has(q.id));
    // 补到 maxActive
    this._fillQuests();
  }

  /** 检查任务进度 */
  update(stats, questCallbacks) {
    for (const quest of this.activeQuests) {
      if (this.completedIds.has(quest.id)) continue;
      if (quest.check(stats)) {
        this.completedIds.add(quest.id);
        if (questCallbacks?.onComplete) {
          questCallbacks.onComplete(quest);
        }
      }
    }
    // 补新任务
    this._fillQuests();
  }

  /** 获取已完成任务的总金币奖励 */
  getCompletedReward() {
    let total = 0;
    for (const q of this.activeQuests) {
      if (this.completedIds.has(q.id)) {
        total += q.reward;
      }
    }
    return total;
  }

  /** 获取活跃任务列表（含完成状态） */
  getActiveWithStatus() {
    return this.activeQuests.map(q => ({
      ...q,
      completed: this.completedIds.has(q.id),
    }));
  }

  _generateQuests() {
    this.activeQuests = [];
    this._addQuest();
    this._addQuest();
    this._addQuest();
  }

  _fillQuests() {
    while (this.activeQuests.length < this.maxActive) {
      if (!this._addQuest()) break;
    }
  }

  _addQuest() {
    const available = QUEST_TEMPLATES.filter(
      t => !this.activeQuests.find(q => q.id === t.id)
    );
    if (available.length === 0) return false;
    const picked = available[Math.floor(Math.random() * available.length)];
    this.activeQuests.push({ ...picked });
    return true;
  }
}
