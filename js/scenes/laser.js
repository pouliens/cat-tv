import { choice, lerp, rand, TAU } from '../utils.js';

export class LaserScene {
  constructor({ audio } = {}) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.x = 200;
    this.y = 200;
    this.tx = 200;
    this.ty = 200;
    this.state = 'zip';
    this.wait = 0;
    this.trail = [];
    this.color = '#ff1e1e';
    this.zipT = 0;
    this.zipDur = 0.3;
    this.sx = 0;
    this.sy = 0;
    this.circle = { r: 0, a: 0, cx: 0, cy: 0 };
  }

  resize(w, h) {
    const first = this.trail.length === 0 && this.t === 0;
    this.w = w;
    this.h = h;
    if (first) {
      this.x = w * 0.4;
      this.y = h * 0.5;
      this.tx = w * 0.7;
      this.ty = h * 0.4;
    }
    this.x = Math.max(20, Math.min(w - 20, this.x));
    this.y = Math.max(20, Math.min(h - 20, this.y));
  }

  start() {
    this.wait = 0.05;
    this.state = 'zip';
    this._pickZip();
  }

  stop() {}

  _margin() {
    return { x0: this.w * 0.06, y0: this.h * 0.08, x1: this.w * 0.94, y1: this.h * 0.92 };
  }

  _randPos() {
    const m = this._margin();
    return { x: rand(m.x0, m.x1), y: rand(m.y0, m.y1) };
  }

  _pickZip() {
    this.audio?.cue();
    this.sx = this.x;
    this.sy = this.y;
    const p = this._randPos();
    // Sometimes zip a long way across the screen
    if (Math.random() < 0.45) {
      p.x = this.x < this.w / 2 ? rand(this.w * 0.65, this.w * 0.94) : rand(this.w * 0.06, this.w * 0.35);
    }
    this.tx = p.x;
    this.ty = p.y;
    const d = Math.hypot(this.tx - this.sx, this.ty - this.sy);
    this.zipDur = Math.max(0.12, Math.min(0.45, d / 1800));
    this.zipT = 0;
  }

  _nextState() {
    const roll = Math.random();
    if (roll < 0.28) {
      this.state = 'pause';
      this.wait = rand(0.25, 1.1);
    } else if (roll < 0.48) {
      this.state = 'crawl';
      const p = this._randPos();
      this.tx = p.x;
      this.ty = p.y;
      this.wait = rand(0.6, 1.6);
    } else if (roll < 0.62) {
      this.state = 'circle';
      this.circle.cx = this.x;
      this.circle.cy = this.y;
      this.circle.r = rand(18, 54);
      this.circle.a = rand(0, TAU);
      this.wait = rand(0.5, 1.2);
    } else if (roll < 0.72) {
      this.state = 'jitter';
      this.wait = rand(0.2, 0.5);
    } else {
      this.state = 'zip';
      this._pickZip();
    }
  }

  update(dt) {
    this.t += dt;
    if (this.state === 'zip') {
      this.zipT += dt;
      const u = Math.min(1, this.zipT / this.zipDur);
      const e = 1 - (1 - u) * (1 - u) * (1 - u);
      this.x = lerp(this.sx, this.tx, e);
      this.y = lerp(this.sy, this.ty, e);
      if (u >= 1) this._nextState();
    } else if (this.state === 'pause') {
      this.x += Math.sin(this.t * 40) * 0.35;
      this.y += Math.cos(this.t * 33) * 0.3;
      this.wait -= dt;
      if (this.wait <= 0) this._nextState();
    } else if (this.state === 'crawl') {
      const k = 1 - Math.pow(0.12, dt);
      this.x = lerp(this.x, this.tx, k * 0.35);
      this.y = lerp(this.y, this.ty, k * 0.35);
      this.wait -= dt;
      if (this.wait <= 0 || Math.hypot(this.tx - this.x, this.ty - this.y) < 8) this._nextState();
    } else if (this.state === 'circle') {
      this.circle.a += dt * 6;
      this.x = this.circle.cx + Math.cos(this.circle.a) * this.circle.r;
      this.y = this.circle.cy + Math.sin(this.circle.a) * this.circle.r * 0.7;
      this.wait -= dt;
      if (this.wait <= 0) this._nextState();
    } else if (this.state === 'jitter') {
      this.x += rand(-90, 90) * dt * 12;
      this.y += rand(-90, 90) * dt * 12;
      const m = this._margin();
      this.x = Math.max(m.x0, Math.min(m.x1, this.x));
      this.y = Math.max(m.y0, Math.min(m.y1, this.y));
      this.wait -= dt;
      if (this.wait <= 0) this._nextState();
    }

    this.trail.push({ x: this.x, y: this.y, t: this.t });
    if (this.trail.length > 40) this.trail.shift();
  }

  draw(ctx) {
    const { w, h } = this;
    ctx.fillStyle = '#14110f';
    ctx.fillRect(0, 0, w, h);

    // Dim living-room floor
    ctx.fillStyle = '#1c1814';
    ctx.fillRect(0, h * 0.18, w, h);
    ctx.strokeStyle = 'rgba(255, 220, 170, 0.04)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const y = h * 0.2 + i * (h * 0.07);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 8);
      ctx.stroke();
    }
    // Soft wall
    const wall = ctx.createLinearGradient(0, 0, 0, h * 0.22);
    wall.addColorStop(0, '#2a2420');
    wall.addColorStop(1, '#1a1613');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, h * 0.2, w, 6);

    // Furniture silhouettes
    ctx.fillStyle = '#0e0c0b';
    ctx.fillRect(w * 0.72, h * 0.58, w * 0.28, h * 0.18);
    ctx.fillRect(0, h * 0.7, w * 0.22, h * 0.14);

    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = (i / this.trail.length) * 0.45;
      ctx.fillStyle = `rgba(255, 40, 40, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + a * 4, 0, TAU);
      ctx.fill();
    }

    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 90);
    glow.addColorStop(0, 'rgba(255, 80, 80, 0.85)');
    glow.addColorStop(0.15, 'rgba(255, 20, 20, 0.35)');
    glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 90, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff5f5';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x - 1.5, this.y - 1.5, 1.8, 0, TAU);
    ctx.fill();
  }
}
