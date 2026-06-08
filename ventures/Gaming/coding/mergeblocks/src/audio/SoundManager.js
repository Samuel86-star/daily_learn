// ============================================================
// SoundManager — 纯 WebAudio 程序化音效合成
// 无外部资源依赖，全部由振荡器 + 包络生成
// ============================================================

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.masterGain) this.masterGain.gain.value = m ? 0 : 0.4;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---------- 基础发声 ----------
  _tone(freq, duration, type = 'sine', volume = 0.5, attack = 0.005, release = 0.1) {
    if (!this._initialized || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + Math.max(duration - release, attack));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  _sweep(fromFreq, toFreq, duration, type = 'sine', volume = 0.4) {
    if (!this._initialized || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(toFreq, 1), now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  _noise(duration, volume = 0.3, lowpassFreq = 2000) {
    if (!this._initialized || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassFreq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  // ---------- 游戏音效 ----------

  /** 点击 — 短促 tap */
  click() {
    this._tone(800, 0.04, 'sine', 0.18, 0.001, 0.03);
  }

  /** 无效点击 — 低沉 dud */
  invalid() {
    this._tone(180, 0.1, 'square', 0.15, 0.005, 0.08);
  }

  /**
   * 合并 — 音高根据合并阶级
   * @param {number} value 升级后的值
   * @param {number} groupSize
   */
  merge(value, groupSize) {
    // 音高 = log2(value) 映射到一组五声音阶
    const rank = Math.log2(value);
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    const baseFreq = pentatonic[Math.min(Math.max(rank - 1, 0), pentatonic.length - 1)] || 523;

    // 主音
    this._sweep(baseFreq * 0.8, baseFreq, 0.18, 'triangle', 0.35);
    // 和声（五度）
    this._sweep(baseFreq * 1.2, baseFreq * 1.5, 0.2, 'sine', 0.18);
    // 大组加点击感
    if (groupSize >= 4) {
      setTimeout(() => this._noise(0.08, 0.15, 3000), 30);
    }
  }

  /** 升级 — 高频闪烁 */
  upgrade(value) {
    const rank = Math.log2(value);
    const baseFreq = 220 * Math.pow(1.05946, rank * 2); // 半音递增
    // 上扬扫频
    this._sweep(baseFreq, baseFreq * 2, 0.25, 'triangle', 0.4);
    // 高频闪光
    setTimeout(() => this._tone(baseFreq * 4, 0.08, 'sine', 0.2, 0.001, 0.06), 60);
  }

  /** Combo — 越高越亮 */
  combo(count) {
    const base = 600 + count * 80;
    this._tone(base, 0.08, 'sine', 0.25);
    setTimeout(() => this._tone(base * 1.5, 0.06, 'sine', 0.2), 40);
    if (count >= 5) {
      setTimeout(() => this._tone(base * 2, 0.05, 'triangle', 0.15), 80);
    }
  }

  /** 大组爆发 — 群音 */
  bigGroup(groupSize) {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    for (let i = 0; i < Math.min(groupSize - 4, 5); i++) {
      setTimeout(() => {
        this._tone(notes[i % notes.length] * 2, 0.12, 'triangle', 0.18);
      }, i * 50);
    }
    // 额外打击
    this._noise(0.15, 0.2, 2500);
  }

  /** 任务完成 — 上扬三音 */
  questComplete() {
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.15, 'triangle', 0.3), i * 80);
    });
  }

  /** 道具使用 */
  itemUse() {
    this._sweep(440, 880, 0.15, 'sine', 0.25);
  }

  /** 死局 / 游戏结束 — 下行三音 */
  gameOver() {
    const notes = [440, 349.23, 261.63];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, 'sine', 0.3), i * 120);
    });
  }

  /** 按钮点击 */
  buttonTap() {
    this._tone(600, 0.05, 'sine', 0.2);
  }
}

// 单例导出
export const sound = new SoundManager();
