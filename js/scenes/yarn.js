import { lerp, rand, TAU } from '../utils.js';

export class YarnScene {
  constructor({ audio } = {}) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.x = 200;
    this.y = 200;
    this.vx = 140;
    this.vy = 90;
    this.r = 46;
    this.rot = 0;
    this.hue = 8;
    this.trail = [];
    this.maxTrail = 280;
    this.unravel = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.r = Math.max(28, Math.min(64, Math.min(w, h) * 0.07));
    this.x = Math.max(this.r, Math.min(w - this.r, this.x));
    this.y = Math.max(this.r, Math.min(h - this.r, this.y));
    if (!this.trail.length) {
      this.x = w * 0.35;
      this.y = h * 0.55;
      this.vx = rand(80, 160) * (Math.random() < 0.5 ? -1 : 1);
      this.vy = rand(60, 130) * (Math.random() < 0.5 ? -1 : 1);
    }
  }

  start() {
    if (this.trail.length < 8) {
      this.trail = [{ x: this.x, y: this.y }];
      for (let i = 0; i < 180; i++) this.update(1 / 60);
    }
  }

  stop() {}

  tap(x, y) {
    // A direct swat bats the ball away. A tap on the rug sends it rolling that way.
    const dx = x - this.x;
    const dy = y - this.y;
    const angle = dx || dy ? Math.atan2(dy, dx) : Math.PI / 4;
    const speed = Math.hypot(dx, dy) <= this.r * 1.4 ? -220 : 220;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.unravel = 1;
  }

  update(dt) {
    this.t += dt;
    const speed = Math.hypot(this.vx, this.vy);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += (this.vx > 0 ? 1 : -1) * (speed / this.r) * dt;

    let bounced = false;
    if (this.x < this.r) { this.x = this.r; this.vx = Math.abs(this.vx) * rand(0.9, 1.15); bounced = true; }
    if (this.x > this.w - this.r) { this.x = this.w - this.r; this.vx = -Math.abs(this.vx) * rand(0.9, 1.15); bounced = true; }
    if (this.y < this.r) { this.y = this.r; this.vy = Math.abs(this.vy) * rand(0.9, 1.15); bounced = true; }
    if (this.y > this.h - this.r) { this.y = this.h - this.r; this.vy = -Math.abs(this.vy) * rand(0.9, 1.15); bounced = true; }

    // Gentle wander so it doesn't just bounce in a predictable box
    this.vx += rand(-1, 1) * 40 * dt;
    this.vy += rand(-1, 1) * 40 * dt;
    const max = 220;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > max) {
      this.vx = (this.vx / sp) * max;
      this.vy = (this.vy / sp) * max;
    }
    if (sp < 70) {
      this.vx *= 1.05;
      this.vy *= 1.05;
    }

    this.trail.push({ x: this.x, y: this.y });
    this.maxTrail = Math.min(400, 180 + Math.floor(this.t * 8));
    if (this.trail.length > this.maxTrail) this.trail.shift();
    if (bounced) {
      this.unravel = 1;
      this.audio?.cue();
    }
    if (this.unravel > 0) this.unravel = Math.max(0, this.unravel - dt * 2);
  }

  draw(ctx) {
    const { w, h } = this;
    ctx.fillStyle = '#f3ead8';
    ctx.fillRect(0, 0, w, h);
    // Rug
    ctx.fillStyle = '#d9c4a0';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.55, w * 0.42, h * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 80, 60, 0.18)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.55, w * 0.36, h * 0.26, 0, 0, TAU);
    ctx.stroke();

    // Yarn trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = `hsl(${this.hue} 72% 42%)`;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        const p = this.trail[i];
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.strokeStyle = `hsl(${this.hue} 80% 58%)`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    const r = this.r * (1 - this.unravel * 0.06);
    // shadow
    ctx.fillStyle = 'rgba(80, 50, 30, 0.22)';
    ctx.beginPath();
    ctx.ellipse(this.x + 4, this.y + r * 0.7, r * 0.9, r * 0.28, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    const ball = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    ball.addColorStop(0, `hsl(${this.hue} 80% 62%)`);
    ball.addColorStop(1, `hsl(${this.hue} 70% 32%)`);
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = `hsl(${this.hue} 50% 22%)`;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.92, r * (0.2 + Math.abs(i) * 0.08), i * 0.4, 0, TAU);
      ctx.stroke();
    }
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (0.25 + Math.abs(i) * 0.1), r * 0.92, i * 0.5 + 0.8, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // loose end coming off the ball
    const last = this.trail[this.trail.length - 8] || this.trail[0];
    if (last) {
      ctx.strokeStyle = `hsl(${this.hue} 72% 40%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + r * 0.2);
      ctx.quadraticCurveTo(lerp(this.x, last.x, 0.5), this.y + r + 8, last.x, last.y);
      ctx.stroke();
    }
  }
}
