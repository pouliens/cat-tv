import { choice, rand, randInt } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._muted = false;
    this._volume = 0.55;
    this._started = false;
  }

  get muted() { return this._muted; }
  get volume() { return this._volume; }

  set muted(v) {
    this._muted = !!v;
    this._applyGain();
  }

  set volume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    this._applyGain();
  }

  _applyGain() {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, now, 0.03);
  }

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this._volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await Promise.race([
          this.ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, 400)),
        ]);
      } catch {}
    }
    this._started = true;
  }

  get ready() {
    return !!(this.ctx && this.ctx.state === 'running' && !this._muted);
  }

  _src(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type;
    if (freq != null) o.frequency.value = freq;
    return o;
  }

  _env(peak, atk, dur, rel, start) {
    const g = this.ctx.createGain();
    const t = start ?? this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + atk);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.7), t + Math.max(atk, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return { gain: g, t, dur };
  }

  _connect(nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    nodes[nodes.length - 1].connect(this.master);
  }

  _tone({ type = 'sine', freq, endFreq, peak = 0.08, atk = 0.008, dur = 0.12, rel = 0.04, start, filter }) {
    if (!this.ready) return;
    const t = start ?? this.ctx.currentTime;
    const osc = this._src(type, freq);
    if (endFreq != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    const { gain } = this._env(peak, atk, dur, rel, t);
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter.type || 'bandpass';
      f.frequency.value = filter.freq || freq;
      f.Q.value = filter.Q || 4;
      this._connect([osc, f, gain]);
    } else {
      this._connect([osc, gain]);
    }
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise({ peak = 0.04, dur = 0.08, atk = 0.004, start, type = 'bandpass', freq = 2000, Q = 2 }) {
    if (!this.ready) return;
    const t = start ?? this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    const { gain } = this._env(peak, atk, dur, dur * 0.4, t);
    this._connect([src, f, gain]);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  birdChirp() {
    if (!this.ready) return;
    const kind = choice(['tweet', 'trill', 'peep', 'warble', 'call']);
    const now = this.ctx.currentTime;
    const base = rand(1800, 4200);

    if (kind === 'peep') {
      this._tone({ type: 'sine', freq: base, endFreq: base * rand(1.05, 1.2), peak: 0.07, dur: rand(0.05, 0.1) });
      return;
    }
    if (kind === 'trill') {
      const n = randInt(5, 9);
      for (let i = 0; i < n; i++) {
        const f = base + Math.sin(i * 1.7) * rand(200, 500);
        this._tone({ type: 'triangle', freq: f, endFreq: f * 1.04, peak: 0.045, dur: 0.045, start: now + i * 0.036 });
      }
      return;
    }
    if (kind === 'warble') {
      this._tone({ type: 'sine', freq: base, endFreq: base * rand(0.6, 0.8), peak: 0.06, dur: rand(0.18, 0.32) });
      this._tone({ type: 'triangle', freq: base * 0.98, endFreq: base * rand(0.7, 0.9), peak: 0.03, dur: rand(0.18, 0.32) });
      return;
    }
    if (kind === 'call') {
      this._tone({ type: 'sine', freq: base, endFreq: base * 0.92, peak: 0.08, dur: 0.14 });
      this._tone({ type: 'sine', freq: base * 0.78, endFreq: base * 0.72, peak: 0.07, dur: 0.16, start: now + 0.15 });
      return;
    }
    const notes = randInt(2, 4);
    for (let i = 0; i < notes; i++) {
      const f = base * (i % 2 === 0 ? 1 : rand(1.08, 1.25));
      this._tone({
        type: 'sine',
        freq: f,
        endFreq: f * rand(0.95, 1.12),
        peak: 0.065,
        dur: rand(0.05, 0.09),
        start: now + i * rand(0.07, 0.11),
      });
    }
  }

  introSting() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    // Original two-note sting — a warm rising fourth, not a trademark melody.
    this._tone({ type: 'triangle', freq: 98, endFreq: 98, peak: 0.14, atk: 0.02, dur: 0.38, start: t });
    this._tone({ type: 'sine', freq: 196, peak: 0.06, atk: 0.02, dur: 0.38, start: t });
    this._noise({ peak: 0.03, dur: 0.18, freq: 400, Q: 0.7, type: 'lowpass', start: t });
    this._tone({ type: 'triangle', freq: 146.8, peak: 0.16, atk: 0.015, dur: 0.55, start: t + 0.28 });
    this._tone({ type: 'sine', freq: 293.7, peak: 0.07, atk: 0.015, dur: 0.55, start: t + 0.28 });
    this._tone({ type: 'sine', freq: 440, peak: 0.03, dur: 0.4, start: t + 0.3 });
  }

  cornerChime() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this._tone({ type: 'sine', freq: f, peak: 0.07 - i * 0.01, dur: 0.16, start: t + i * 0.06 });
    });
  }

  bubble() {
    if (!this.ready) return;
    const f = rand(420, 900);
    this._tone({ type: 'sine', freq: f, endFreq: f * rand(1.6, 2.4), peak: 0.03, atk: 0.004, dur: rand(0.08, 0.16) });
  }

  scurry() {
    if (!this.ready) return;
    this._noise({ peak: 0.035, dur: rand(0.08, 0.18), freq: rand(1800, 3200), Q: 1.4, type: 'bandpass' });
  }

  cricket() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      this._noise({ peak: 0.018, dur: 0.04, freq: rand(3500, 5500), Q: 8, type: 'bandpass', start: t + i * 0.055 });
    }
  }
}
