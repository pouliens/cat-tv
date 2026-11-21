import { clamp, nearestTo, rand, TAU } from '../utils.js';

export class FirefliesScene {
  constructor({ audio }) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.bugs = [];
    this.stars = [];
    this.cricketT = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    if (!this.bugs.length) this._spawn();
  }

  start() {
    if (!this.bugs.length) this._spawn();
    this.cricketT = 1;
  }

  stop() {}

  _spawn() {
    const { w, h } = this;
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.55,
        r: rand(0.6, 1.8),
        a: rand(0.3, 0.9),
      });
    }
    this.bugs = [];
    const n = Math.max(36, Math.round((w * h) / 18000));
    for (let i = 0; i < n; i++) {
      this.bugs.push({
        x: rand(0, w),
        y: rand(h * 0.15, h * 0.9),
        vx: rand(-18, 18),
        vy: rand(-12, 12),
        phase: rand(0, TAU),
        speed: rand(0.5, 1.4),
        duty: rand(0.15, 0.5),
        period: rand(1.6, 4.2),
        size: rand(1.6, 3.2),
        warm: Math.random() < 0.7,
      });
    }
  }

  tap(x, y) {
    this.light = { x, y: clamp(y, this.h * .08, this.h * .95), time: 1.2 };
    const closest = nearestTo(this.bugs, x, y);
    const reach = Math.max(110, Math.min(this.w, this.h) * .32);
    for (const bug of this.bugs) {
      bug.follow = bug === closest || Math.hypot(bug.x - x, bug.y - y) < reach;
    }
  }

  update(dt) {
    this.t += dt;
    const { w, h } = this;
    if (this.light) {
      this.light.time -= dt;
      if (this.light.time <= 0) this.light = null;
    }
    for (const b of this.bugs) {
      if (b.follow && this.light) {
        const follow = 1 - Math.exp(-1.9 * dt);
        b.x += (this.light.x + 20 * Math.cos(b.phase) - b.x) * follow;
        b.y += (this.light.y + 20 * Math.sin(b.phase) - b.y) * follow;
      }
      b.x += b.vx * dt + Math.sin(this.t * 0.7 + b.phase) * 6 * dt;
      b.y += b.vy * dt + Math.cos(this.t * 0.5 + b.phase) * 5 * dt;
      if (Math.random() < dt * 0.3) {
        b.vx += rand(-10, 10);
        b.vy += rand(-8, 8);
        b.vx = Math.max(-24, Math.min(24, b.vx));
        b.vy = Math.max(-16, Math.min(16, b.vy));
      }
      if (b.x < 0) b.x += w;
      if (b.x > w) b.x -= w;
      if (b.y < h * 0.08) { b.y = h * 0.08; b.vy = Math.abs(b.vy); }
      if (b.y > h * 0.95) { b.y = h * 0.95; b.vy = -Math.abs(b.vy); }
    }
    this.cricketT -= dt;
    if (this.cricketT <= 0) {
      if (Math.random() < 0.7) this.audio?.cue();
      this.cricketT = rand(1.8, 4.5);
    }
  }

  _glow(b) {
    const u = (this.t * b.speed / b.period + b.phase) % 1;
    // Slow rise, quicker fall
    if (u < b.duty) {
      const t = u / b.duty;
      return t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45 * 0.85;
    }
    return 0.04;
  }

  draw(ctx) {
    const { w, h } = this;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#050616');
    bg.addColorStop(0.45, '#0b1430');
    bg.addColorStop(0.75, '#122018');
    bg.addColorStop(1, '#0a140c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Moon
    const mx = w * 0.8;
    const my = h * 0.16;
    const mr = Math.min(w, h) * 0.07;
    const moon = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 3);
    moon.addColorStop(0, 'rgba(255, 245, 210, 0.85)');
    moon.addColorStop(0.2, 'rgba(255, 245, 210, 0.2)');
    moon.addColorStop(1, 'rgba(255, 245, 210, 0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f7f1d0';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#dbe7ff';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a * (0.7 + Math.sin(this.t + s.x) * 0.3);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Tree silhouettes
    ctx.fillStyle = '#04060c';
    this._tree(ctx, w * 0.08, h * 0.98, h * 0.55);
    this._tree(ctx, w * 0.22, h * 0.98, h * 0.4);
    this._tree(ctx, w * 0.9, h * 0.98, h * 0.5);
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
    // grass blades
    ctx.strokeStyle = '#07140c';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * w;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + 4, h * 0.92, x + Math.sin(i) * 6, h * 0.86);
      ctx.stroke();
    }

    for (const b of this.bugs) {
      const g = Math.max(this._glow(b), b.follow && this.light ? Math.min(.9, this.light.time) : 0);
      if (g < 0.05) {
        ctx.fillStyle = `rgba(180, 220, 80, ${0.15 + g})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.2, 0, TAU);
        ctx.fill();
        continue;
      }
      const col = b.warm ? '255, 230, 90' : '190, 255, 120';
      const rad = 18 + g * 22;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rad);
      grd.addColorStop(0, `rgba(${col}, ${0.95 * g})`);
      grd.addColorStop(0.25, `rgba(${col}, ${0.4 * g})`);
      grd.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, rad, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 220, ${g})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, TAU);
      ctx.fill();
    }
  }

  _tree(ctx, x, y, ht) {
    ctx.fillRect(x - 7, y - ht * 0.42, 14, ht * 0.42);
    // Each lobe starts its own subpath; without moveTo the path joins them
    // with straight lines that cut wedge-shaped gaps out of the crown.
    const lobes = [
      [x, y - ht * 0.58, ht * 0.22, ht * 0.3],
      [x - ht * 0.16, y - ht * 0.46, ht * 0.16, ht * 0.2],
      [x + ht * 0.16, y - ht * 0.46, ht * 0.16, ht * 0.2],
      [x, y - ht * 0.72, ht * 0.14, ht * 0.16],
    ];
    ctx.beginPath();
    for (const [cx, cy, rx, ry] of lobes) {
      ctx.moveTo(cx + rx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    }
    ctx.fill();
  }
}
