import { choice, rand, TAU } from '../utils.js';

const COLORS = ['#ff3b3b', '#ff8a00', '#ffd400', '#3dff7a', '#3dc6ff', '#4d6bff', '#c44dff', '#ff4dcc'];

export class LogoScene {
  constructor({ audio }) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.x = 80;
    this.y = 80;
    this.vx = 160;
    this.vy = 130;
    this.color = COLORS[0];
    this.colorIndex = 0;
    this.logoW = 280;
    this.logoH = 120;
    this.particles = [];
    this.flash = 0;
    this.rings = [];
    this.t = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this._measure();
    this.x = Math.min(this.x, Math.max(0, w - this.logoW));
    this.y = Math.min(this.y, Math.max(0, h - this.logoH));
  }

  _measure() {
    const s = Math.min(this.w, this.h);
    this.logoW = Math.max(180, Math.min(360, s * 0.36));
    this.logoH = this.logoW * 0.42;
  }

  start() {
    this._measure();
    if (this.x === 80 && this.y === 80) {
      this.x = rand(20, Math.max(21, this.w - this.logoW - 20));
      this.y = rand(20, Math.max(21, this.h - this.logoH - 20));
      const dirX = Math.random() < 0.5 ? -1 : 1;
      const dirY = Math.random() < 0.5 ? -1 : 1;
      const speed = Math.min(this.w, this.h) * 0.22;
      this.vx = speed * dirX * rand(0.9, 1.15);
      this.vy = speed * 0.82 * dirY * rand(0.9, 1.15);
    }
  }

  stop() {}

  _hitColor() {
    this.colorIndex = (this.colorIndex + 1) % COLORS.length;
    this.color = COLORS[this.colorIndex];
  }

  _celebrate(cx, cy) {
    this.flash = 1;
    this.audio?.cornerChime?.();
    this.rings.push({ x: cx, y: cy, r: 10, life: 1, color: this.color });
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * TAU + rand(-0.1, 0.1);
      const sp = rand(80, 320);
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.6, 1.2),
        max: 1,
        r: rand(2, 6),
        color: choice(COLORS),
      });
    }
  }

  update(dt) {
    this.t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    let hitX = false;
    let hitY = false;
    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
      hitX = true;
    } else if (this.x + this.logoW >= this.w) {
      this.x = this.w - this.logoW;
      this.vx = -Math.abs(this.vx);
      hitX = true;
    }
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
      hitY = true;
    } else if (this.y + this.logoH >= this.h) {
      this.y = this.h - this.logoH;
      this.vy = -Math.abs(this.vy);
      hitY = true;
    }
    if (hitX || hitY) this._hitColor();
    if (hitX && hitY) {
      this._celebrate(this.x + this.logoW / 2, this.y + this.logoH / 2);
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.8);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.life -= dt * 0.9;
      r.r += dt * 280;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
  }

  draw(ctx) {
    const { w, h } = this;
    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, 0, w, h);

    for (const r of this.rings) {
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.life) * 0.8;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / (p.max || 1));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const x = this.x;
    const y = this.y;
    const lw = this.logoW;
    const lh = this.logoH;
    const r = Math.min(18, lh * 0.18);
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = this.color;
    this._roundRect(ctx, x, y, lw, lh, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#08080d';
    this._roundRect(ctx, x + 6, y + 6, lw - 12, lh - 12, Math.max(4, r - 3));
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.font = `800 ${Math.floor(lh * 0.42)}px Outfit, Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CAT TV', x + lw / 2, y + lh / 2 + 1);
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.28})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
