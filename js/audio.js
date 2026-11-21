import { rand } from './utils.js';

// Each cue is short and sparse. Individual scenes trigger it from a movement or a timer.
const CUES = {
  aquarium(s) {
    const pitch = rand(380, 560);
    s.tone(pitch, pitch * 1.5, .17, .11);
  },
  goldfish(s) { s.tone(345, 465, .21, .065); },
  logo(s) { s.tone(350, 275, .20, .085); },
  intro(s) {
    s.tone(220, 220, .42, .09);
    s.tone(294, 294, .48, .075, .23);
  },
  birds(s) {
    const pitch = rand(1100, 1700);
    s.tone(pitch, pitch * 1.18, .13, .10);
    if (Math.random() < .6) s.tone(pitch * 1.12, pitch, .12, .07, .20);
  },
  laser(s) { s.tone(470, 310, .13, .065); },
  mice(s) {
    s.rustle(1250, .13, .32);
    s.rustle(900, .11, .25, .16);
  },
  butterflies(s) { s.rustle(800, .48, .25); },
  wand(s) { s.rustle(1450, .25, .30); },
  yarn(s) {
    s.tone(210, 145, .18, .09);
    s.rustle(580, .21, .23);
  },
  fireflies(s) {
    s.tone(1420, 1500, .10, .052);
    s.tone(1500, 1420, .11, .044, .16);
  },
};

// Direct responses to a tap. Unlike cues they are not rate limited, so every paw gets an answer.
const SOUNDS = {
  goldfish: {
    plip(s) {
      const pitch = rand(520, 720);
      s.tone(pitch, pitch * 2.4, .075, .16);
      s.tone(pitch * 1.5, pitch * 3, .05, .06, .05);
    },
    swish(s) {
      s.rustle(2400, .26, .34, 0, 520);
      s.tone(300, 170, .14, .05);
    },
    splash(s) {
      s.rustle(3200, .5, .55, 0, 420);
      s.rustle(1300, .34, .32, .04, 260);
      s.tone(240, 80, .3, .2);
      for (let i = 0; i < 5; i++) {
        const pitch = rand(1300, 2400);
        s.tone(pitch, pitch * 1.5, .05, .07, rand(.16, .55));
      }
    },
    surface(s) {
      s.tone(170, 520, .2, .16);
      s.tone(620, 1300, .07, .07, .15);
      s.rustle(1800, .16, .14, .08, 900);
    },
    nibble(s) {
      s.tone(900, 1700, .045, .08);
      s.tone(1100, 2100, .04, .06, .09);
    },
  },
};

export class AudioEngine {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.ctx = null;
    this.master = null;
    this.bus = null;
    this.sceneId = null;
    this.lastCue = -Infinity;
    this._muted = false;
    this._volume = .35;
    this.supported = Boolean(window.AudioContext || window.webkitAudioContext);
  }

  get ready() { return this.ctx?.state === 'running' && !this._muted; }
  get volume() { return this._volume; }
  get muted() { return this._muted; }
  set muted(value) { this._muted = Boolean(value); this.applyVolume(); }
  set volume(value) { this._volume = Math.max(0, Math.min(1, value)); this.applyVolume(); }

  applyVolume() {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, now, .025);
  }

  unlock() {
    if (!this.supported || this._muted) return;
    try {
      if (!this.ctx) {
        const Context = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Context();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._volume;
        this.master.connect(this.ctx.destination);
        this.ctx.onstatechange = () => this.onStateChange?.();
        this.setScene(this.sceneId);
      }
      // A blocked resume can stay pending until the next genuine user gesture.
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    } catch {
      this.supported = false;
    }
    this.onStateChange?.();
  }

  setScene(id) {
    this.sceneId = id;
    this.lastCue = -Infinity;
    if (!this.ctx) return;
    const old = this.bus;
    if (old) {
      old.gain.setTargetAtTime(0, this.ctx.currentTime, .012);
      setTimeout(() => old.disconnect(), 80);
    }
    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);
  }

  cue() {
    if (!this.ready || !this.bus || !CUES[this.sceneId]) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCue < 1.8) return;
    this.lastCue = now;
    CUES[this.sceneId](this);
  }

  sound(name) {
    const play = SOUNDS[this.sceneId]?.[name];
    if (!this.ready || !this.bus || !play) return;
    play(this);
  }

  // Give each sound a short attack and a smooth tail, including delayed notes.
  play(source, output, duration, peak, delay) {
    const t = this.ctx.currentTime + delay;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(peak, t + Math.min(.055, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    output.connect(envelope);
    envelope.connect(this.bus);
    source.onended = () => {
      source.disconnect();
      if (output !== source) output.disconnect();
      envelope.disconnect();
    };
    source.start(t);
    source.stop(t + duration);
  }

  tone(startPitch, endPitch, duration, peak, delay = 0) {
    const source = this.ctx.createOscillator();
    const t = this.ctx.currentTime + delay;
    source.frequency.setValueAtTime(startPitch, t);
    source.frequency.exponentialRampToValueAtTime(endPitch, t + duration);
    this.play(source, source, duration, peak, delay);
  }

  rustle(pitch, duration, peak, delay = 0, endPitch = pitch) {
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const t = this.ctx.currentTime + delay;
    filter.frequency.setValueAtTime(pitch, t);
    if (endPitch !== pitch) filter.frequency.exponentialRampToValueAtTime(endPitch, t + duration);
    filter.Q.value = .8;
    source.connect(filter);
    this.play(source, filter, duration, peak, delay);
  }
}
