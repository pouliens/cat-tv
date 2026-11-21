import { choice, rand, TAU } from '../utils.js';

const WING_COLORS = [
  ['#ff7a18', '#ffd166', '#7a2200'],
  ['#3d7eff', '#9ec1ff', '#163a8a'],
  ['#f2d022', '#fff3a3', '#8a6a00'],
  ['#ff5aa5', '#ffc1de', '#8a1048'],
  ['#f7f7f7', '#d9ecff', '#6a7380'],
  ['#7c3aed', '#d8b4fe', '#3b0764'],
  ['#22c55e', '#bbf7d0', '#14532d'],
];

export class ButterfliesScene {
  constructor() {
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.bugs = [];
    this.flowers = [];
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    if (!this.flowers.length) this._spawn();
    else this._layoutFlowers();
  }

  start() {
    if (!this.bugs.length) this._spawn();
  }

  stop() {}

  _layoutFlowers() {
    const { w, h } = this;
    if (!this.flowers.length) {
      const n = Math.max(8, Math.round(w / 110));
      for (let i = 0; i < n; i++) {
        this.flowers.push({
          x: rand(w * 0.05, w * 0.95),
          y: rand(h * 0.62, h * 0.9),
          color: choice(['#fff7d6', '#ff5a6a', '#ffd166', '#c084fc', '#f8fafc']),
          center: choice(['#f0c14b', '#f59e0b', '#7c2d12']),
          s: rand(12, 22),
          stem: rand(28, 54),
        });
      }
    } else {
      for (const f of this.flowers) {
        f.x = Math.max(20, Math.min(w - 20, f.x));
        f.y = Math.max(h * 0.6, Math.min(h - 20, f.y));
      }
    }
  }

  _spawn() {
    this._layoutFlowers();
    this.bugs = [];
    const n = Math.max(10, Math.round(this.w / 110));
    for (let i = 0; i < n; i++) {
      this.bugs.push(this._newBug());
    }
  }

  _newBug() {
    const pal = choice(WING_COLORS);
    return {
      x: rand(40, this.w - 40),
      y: rand(40, this.h * 0.7),
      a: rand(0, TAU),
      sp: rand(50, 110),
      turn: rand(-1.6, 1.6),
      flap: rand(14, 24),
      phase: rand(0, TAU),
      pal,
      size: rand(14, 24),
      state: Math.random() < 0.2 ? 'land' : 'fly',
      wait: rand(0.5, 3),
      flower: null,
    };
  }

  update(dt) {
    this.t += dt;
    const { w, h } = this;
    for (const b of this.bugs) {
      b.wait -= dt;
      if (b.state === 'land') {
        if (b.flower) {
          b.x = b.flower.x + Math.sin(this.t * 2 + b.phase) * 1.5;
          b.y = b.flower.y - b.flower.s * 0.3;
        }
        if (b.wait <= 0) {
          b.state = 'fly';
          b.a = rand(-2.4, -0.7);
          b.wait = rand(2.5, 6);
          b.flower = null;
        }
      } else {
        b.a += b.turn * dt + Math.sin(this.t * 1.7 + b.phase) * 1.2 * dt;
        if (Math.random() < dt * 0.4) b.turn = rand(-1.8, 1.8);
        b.x += Math.cos(b.a) * b.sp * dt;
        b.y += Math.sin(b.a) * b.sp * 0.85 * dt;
        if (b.x < 20) { b.x = 20; b.a = rand(-0.6, 0.6); }
        if (b.x > w - 20) { b.x = w - 20; b.a = Math.PI + rand(-0.6, 0.6); }
        if (b.y < 20) { b.y = 20; b.a = rand(0.4, Math.PI - 0.4); }
        if (b.y > h * 0.92) { b.y = h * 0.92; b.a = -rand(0.4, 2.4); }
        if (b.wait <= 0 && this.flowers.length) {
          const f = choice(this.flowers);
          const d = Math.hypot(f.x - b.x, f.y - b.y);
          if (d < 50) {
            b.state = 'land';
            b.flower = f;
            b.wait = rand(1.2, 3.5);
          } else if (d < 220) {
            b.a = Math.atan2(f.y - b.y, f.x - b.x);
            b.wait = 0.4;
          } else {
            b.wait = rand(1, 3);
          }
        }
      }
    }
  }

  draw(ctx) {
    const { w, h } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8fd3f4');
    sky.addColorStop(0.55, '#d9f0a8');
    sky.addColorStop(1, '#63a73a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(w * 0.18, h * 0.16, Math.min(w, h) * 0.07, 0, TAU);
    ctx.fill();

    // Hills
    ctx.fillStyle = '#6fbc4a';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.quadraticCurveTo(w * 0.25, h * 0.5, w * 0.5, h * 0.62);
    ctx.quadraticCurveTo(w * 0.75, h * 0.72, w, h * 0.56);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.fillStyle = '#5aa33c';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    for (const f of this.flowers) this._drawFlower(ctx, f);
    for (const b of this.bugs) this._drawBug(ctx, b);
  }

  _drawFlower(ctx, f) {
    ctx.strokeStyle = '#2f7a28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + Math.sin(f.x) * 4, f.y + f.stem);
    ctx.stroke();
    ctx.save();
    ctx.translate(f.x, f.y);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(TAU / 6);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, -f.s * 0.55, f.s * 0.32, f.s * 0.55, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = f.center;
    ctx.beginPath();
    ctx.arc(0, 0, f.s * 0.28, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  _drawBug(ctx, b) {
    const flap = b.state === 'land'
      ? 0.15 + Math.sin(this.t * 3 + b.phase) * 0.05
      : (Math.sin(this.t * b.flap + b.phase) + 1) * 0.5;
    const open = 0.25 + flap * 0.95;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a + Math.PI / 2);
    const s = b.size;
    // left wing
    ctx.fillStyle = b.pal[0];
    ctx.beginPath();
    ctx.ellipse(-s * 0.35 * open, -s * 0.05, s * 0.42, s * 0.7, -0.4 * open, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal[1];
    ctx.beginPath();
    ctx.ellipse(-s * 0.3 * open, 0, s * 0.22, s * 0.35, -0.4 * open, 0, TAU);
    ctx.fill();
    // right
    ctx.fillStyle = b.pal[0];
    ctx.beginPath();
    ctx.ellipse(s * 0.35 * open, -s * 0.05, s * 0.42, s * 0.7, 0.4 * open, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal[1];
    ctx.beginPath();
    ctx.ellipse(s * 0.3 * open, 0, s * 0.22, s * 0.35, 0.4 * open, 0, TAU);
    ctx.fill();
    // body
    ctx.fillStyle = b.pal[2];
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.1, s * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -s * 0.5, s * 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
