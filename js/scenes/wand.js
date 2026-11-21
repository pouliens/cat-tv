import { rand, TAU } from '../utils.js';

export class WandScene {
  constructor({ audio } = {}) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.hand = { x: 0, y: 0 };
    this.mode = 'sweep';
    this.wait = 0;
    this.target = { x: 0, y: 0 };
    this.origin = { x: 0, y: 0 };
    this.segs = [];
    this.n = 18;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.origin = { x: w * 0.72, y: -10 };
    if (!this.segs.length) this._initRope();
  }

  start() {
    if (!this.segs.length) this._initRope();
    this.mode = 'sweep';
    this.wait = 2;
    this.hand.x = this.w * 0.5;
    this.hand.y = this.h * 0.2;
  }

  stop() {}

  _initRope() {
    const len = Math.min(this.w, this.h) * 0.55;
    const rest = len / this.n;
    this.rest = rest;
    this.segs = [];
    for (let i = 0; i < this.n; i++) {
      this.segs.push({
        x: this.w * 0.5,
        y: this.h * 0.15 + i * rest,
        px: this.w * 0.5,
        py: this.h * 0.15 + i * rest,
      });
    }
  }

  _pickMode() {
    this.audio?.cue();
    const roll = Math.random();
    if (roll < 0.28) { this.mode = 'sweep'; this.wait = rand(1.6, 3.2); }
    else if (roll < 0.46) { this.mode = 'figure8'; this.wait = rand(2, 4); }
    else if (roll < 0.62) { this.mode = 'twitch'; this.wait = rand(0.8, 1.6); }
    else if (roll < 0.8) { this.mode = 'drag'; this.wait = rand(1.4, 2.6); }
    else { this.mode = 'yank'; this.wait = rand(0.5, 1.1); }
  }

  update(dt) {
    this.t += dt;
    this.wait -= dt;
    const { w, h } = this;
    let hx = this.hand.x;
    let hy = this.hand.y;
    if (this.mode === 'sweep') {
      hx = w * 0.5 + Math.sin(this.t * 1.2) * w * 0.32;
      hy = h * 0.18 + Math.sin(this.t * 0.6) * h * 0.08;
    } else if (this.mode === 'figure8') {
      hx = w * 0.5 + Math.sin(this.t * 1.6) * w * 0.28;
      hy = h * 0.28 + Math.sin(this.t * 3.2) * h * 0.16;
    } else if (this.mode === 'twitch') {
      hx += rand(-1, 1) * w * 0.015;
      hy += rand(-1, 1) * h * 0.012;
      if (Math.random() < 0.08) {
        hx += rand(-w, w) * 0.04;
        hy += rand(-h, h) * 0.03;
      }
    } else if (this.mode === 'drag') {
      hx = w * 0.5 + Math.sin(this.t * 0.8) * w * 0.3;
      hy = h * 0.62 + Math.sin(this.t * 1.5) * 16;
    } else if (this.mode === 'yank') {
      hx = w * 0.5 + Math.sin(this.t * 8) * 20;
      hy = h * 0.12 + Math.cos(this.t * 5) * 10;
    }
    this.hand.x = Math.max(w * 0.08, Math.min(w * 0.92, hx));
    this.hand.y = Math.max(h * 0.06, Math.min(h * 0.72, hy));
    if (this.wait <= 0) this._pickMode();

    // Verlet rope pinned to hand
    const segs = this.segs;
    segs[0].x = this.hand.x;
    segs[0].y = this.hand.y;
    const g = 980;
    for (let i = 1; i < segs.length; i++) {
      const s = segs[i];
      const vx = s.x - s.px;
      const vy = s.y - s.py;
      s.px = s.x;
      s.py = s.y;
      s.x += vx * 0.94;
      s.y += vy * 0.94 + g * dt * dt;
    }
    for (let k = 0; k < 12; k++) {
      segs[0].x = this.hand.x;
      segs[0].y = this.hand.y;
      for (let i = 1; i < segs.length; i++) {
        const a = segs[i - 1];
        const b = segs[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const diff = (d - this.rest) / d;
        if (i === 1) {
          b.x -= dx * diff;
          b.y -= dy * diff;
        } else {
          a.x += dx * diff * 0.5;
          a.y += dy * diff * 0.5;
          b.x -= dx * diff * 0.5;
          b.y -= dy * diff * 0.5;
        }
      }
      const floor = this.h * 0.86;
      for (let i = 1; i < segs.length; i++) {
        if (segs[i].y > floor) segs[i].y = floor;
      }
    }
  }

  draw(ctx) {
    const { w, h } = this;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#efe4d2');
    bg.addColorStop(0.55, '#e6d5b8');
    bg.addColorStop(1, '#c9ae86');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sofa silhouette
    ctx.fillStyle = '#6b4a36';
    ctx.beginPath();
    ctx.roundRect?.(w * 0.08, h * 0.7, w * 0.84, h * 0.28, 20);
    if (!ctx.roundRect) {
      ctx.rect(w * 0.08, h * 0.7, w * 0.84, h * 0.28);
    }
    ctx.fill();
    ctx.fillStyle = '#5a3d2c';
    ctx.fillRect(w * 0.08, h * 0.82, w * 0.84, h * 0.18);
    ctx.fillStyle = '#7a5842';
    ctx.fillRect(w * 0.14, h * 0.66, w * 0.22, h * 0.1);
    ctx.fillRect(w * 0.64, h * 0.66, w * 0.22, h * 0.1);

    // Wand stick from top toward the hand
    const ox = this.origin.x;
    const oy = this.origin.y;
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(this.hand.x, this.hand.y);
    ctx.stroke();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(this.hand.x, this.hand.y, 7, 0, TAU);
    ctx.fill();

    // String
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.segs[0].x, this.segs[0].y);
    for (let i = 1; i < this.segs.length - 1; i++) {
      const midX = (this.segs[i].x + this.segs[i + 1].x) / 2;
      const midY = (this.segs[i].y + this.segs[i + 1].y) / 2;
      ctx.quadraticCurveTo(this.segs[i].x, this.segs[i].y, midX, midY);
    }
    const last = this.segs[this.segs.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    const tip = this.segs[this.segs.length - 1];
    const prev = this.segs[this.segs.length - 2];
    const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    this._drawFeather(ctx, tip.x, tip.y, ang);
  }

  _drawFeather(ctx, x, y, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    const colors = ['#ff4d6d', '#ffd166', '#fff8e8', '#5ec8ff'];
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.22 + Math.sin(this.t * 10 + i) * 0.08;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.ellipse(0, -22 - i * 2, 7 + (i % 3), 26 + i * 2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-1.5, -8, 3, 22);
    ctx.restore();
  }
}
