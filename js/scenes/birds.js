import { nearestTo, choice, rand, randInt, TAU } from '../utils.js';

const BIRD_COLORS = [
  { body: '#5b3a29', wing: '#3a2418', belly: '#d8b896', beak: '#e09a2d' },
  { body: '#c0392b', wing: '#7a1f16', belly: '#f5d0a9', beak: '#f0c14b' },
  { body: '#2e6b9e', wing: '#1d3f64', belly: '#d6e7f5', beak: '#f0c14b' },
  { body: '#2c2c2c', wing: '#111', belly: '#555', beak: '#f0c14b' },
  { body: '#e7c15c', wing: '#b8891e', belly: '#fff3c4', beak: '#c0392b' },
];

export class BirdsScene {
  constructor({ audio }) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.birds = [];
    this.perches = [];
    this.chirpT = 0;
    this.leaves = [];
  }

  resize(w, h) {
    const first = !this.birds.length;
    this.w = w;
    this.h = h;
    this._layoutPerches();
    if (first) this._spawn();
  }

  start() {
    if (!this.birds.length) this._spawn();
    this.chirpT = 0.4;
  }

  stop() {}

  _layoutPerches() {
    const { w, h } = this;
    this.branch = {
      y: h * 0.58,
      x0: w * -0.05,
      x1: w * 1.05,
      ctrl: h * 0.5,
    };
    this.perches = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = 0.12 + (i / (n - 1)) * 0.76;
      const x = w * u;
      const y = this._branchY(x) - 2;
      this.perches.push({ x, y, taken: false });
    }
    this.leaves = [];
    for (let i = 0; i < 22; i++) {
      const x = w * rand(0.05, 0.95);
      this.leaves.push({
        x,
        y: this._branchY(x) + rand(-18, 8),
        s: rand(10, 22),
        rot: rand(-0.8, 0.8),
        color: choice(['#2f7a3a', '#3f9a4a', '#246830', '#5aaa4a']),
      });
    }
  }

  _branchY(x) {
    const { w } = this;
    const u = x / w;
    return this.branch.y + Math.sin(u * Math.PI) * (this.h * -0.08) + Math.sin(u * 6) * 8;
  }

  _spawn() {
    this.birds = [];
    const n = Math.max(7, Math.round(this.w / 160));
    for (let i = 0; i < n; i++) {
      const pal = choice(BIRD_COLORS);
      const perched = Math.random() < 0.55 && i < this.perches.length;
      const bird = {
        pal,
        size: rand(16, 28),
        phase: rand(0, TAU),
        state: perched ? 'perch' : 'fly',
        x: rand(0, this.w),
        y: rand(this.h * 0.1, this.h * 0.5),
        vx: 0,
        vy: 0,
        flap: rand(12, 20),
        hopT: 0,
        wait: rand(0.4, 2.5),
        perch: null,
        heading: Math.random() < 0.5 ? 1 : -1,
        pathT: rand(0, 10),
      };
      if (perched) {
        const p = this.perches[i];
        bird.x = p.x;
        bird.y = p.y;
        bird.perch = p;
        p.taken = true;
      } else {
        bird.vx = bird.heading * rand(70, 140);
        bird.vy = rand(-20, 20);
      }
      this.birds.push(bird);
    }
  }

  _takeoff(b) {
    if (b.perch) b.perch.taken = false;
    b.perch = null;
    b.state = 'fly';
    b.heading = Math.random() < 0.5 ? -1 : 1;
    b.vx = b.heading * rand(90, 170);
    b.vy = rand(-80, -20);
    b.wait = rand(2.5, 6);
  }

  _land(b, p) {
    b.state = 'perch';
    b.perch = p;
    p.taken = true;
    b.x = p.x;
    b.y = p.y;
    b.vx = 0;
    b.vy = 0;
    b.wait = rand(2, 6);
    b.hopT = 0;
  }

  tap(x, y) {
    const bird = nearestTo(this.birds, x, y);
    this._takeoff(bird);
    bird.heading = bird.x >= x ? 1 : -1;
    bird.vx = bird.heading * 190;
    bird.vy = -100;
  }

  update(dt) {
    this.t += dt;
    const { w, h } = this;
    for (const b of this.birds) {
      b.wait -= dt;
      if (b.state === 'perch') {
        if (b.hopT > 0) {
          b.hopT -= dt;
          b.y = b.perch.y - Math.sin(Math.max(0, b.hopT) / 0.22 * Math.PI) * 8;
          if (b.hopT <= 0) b.y = b.perch.y;
        } else if (Math.random() < dt * 0.6) {
          b.hopT = 0.22;
          b.heading *= Math.random() < 0.3 ? -1 : 1;
        }
        if (b.wait <= 0) this._takeoff(b);
      } else {
        b.pathT += dt;
        b.x += b.vx * dt;
        b.y += (b.vy + Math.sin(b.pathT * 2.2 + b.phase) * 28) * dt;
        if (b.y < 20) { b.y = 20; b.vy = Math.abs(b.vy); }
        if (b.y > h * 0.72) { b.y = h * 0.72; b.vy = -Math.abs(b.vy); }
        if (b.x < -40) { b.x = w + 40; b.y = rand(h * 0.1, h * 0.5); }
        if (b.x > w + 40) { b.x = -40; b.y = rand(h * 0.1, h * 0.5); }
        b.heading = b.vx >= 0 ? 1 : -1;
        if (b.wait <= 0) {
          const free = this.perches.filter((p) => !p.taken);
          if (free.length && Math.random() < 0.7) {
            const p = choice(free);
            const dx = p.x - b.x;
            const dy = p.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 80) {
              this._land(b, p);
            } else {
              b.vx = (dx / d) * 160;
              b.vy = (dy / d) * 120;
              b.wait = 0.4;
            }
          } else {
            b.vx = (Math.random() < 0.5 ? -1 : 1) * rand(80, 160);
            b.vy = rand(-40, 30);
            b.wait = rand(2, 5);
          }
        }
      }
    }
    this.chirpT -= dt;
    if (this.chirpT <= 0) {
      this.audio?.cue();
      this.chirpT = rand(0.35, 2.2);
      if (Math.random() < 0.25) this.chirpT = rand(0.08, 0.22);
    }
  }

  draw(ctx) {
    const { w, h } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7ec8e8');
    sky.addColorStop(0.55, '#c9eaf5');
    sky.addColorStop(0.78, '#e8f5d4');
    sky.addColorStop(1, '#7dba4c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.16, Math.min(w, h) * 0.08, 0, TAU);
    ctx.fill();

    this._drawFarTrees(ctx);
    this._drawGrass(ctx);
    this._drawBranch(ctx);
    for (const b of this.birds) this._drawBird(ctx, b);
  }

  _drawFarTrees(ctx) {
    const { w, h } = this;
    ctx.fillStyle = '#5a9a4a';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    for (let i = 0; i <= 8; i++) {
      const x = (w / 8) * i;
      ctx.quadraticCurveTo(x - w / 16, h * 0.55 - (i % 3) * 20, x, h * 0.68);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  _drawGrass(ctx) {
    const { w, h } = this;
    const g = ctx.createLinearGradient(0, h * 0.78, 0, h);
    g.addColorStop(0, '#6bbb45');
    g.addColorStop(1, '#3f8a28');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.strokeStyle = 'rgba(40, 80, 20, 0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) {
      const x = (i * 47 + this.t * 0) % w;
      const y = h * 0.8 + (i * 13) % (h * 0.18);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 3, y - 10, x + Math.sin(i) * 4, y - 16);
      ctx.stroke();
    }
  }

  _drawBranch(ctx) {
    const { w } = this;
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.branch.x0, this._branchY(this.branch.x0));
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, this._branchY(x));
    ctx.lineTo(this.branch.x1, this._branchY(this.branch.x1));
    ctx.stroke();
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 6;
    ctx.stroke();
    for (const leaf of this.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.fillStyle = leaf.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.s, leaf.s * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawBird(ctx, b) {
    const flap = b.state === 'fly' ? (Math.sin(this.t * b.flap + b.phase) + 1) * 0.5 : 0.1;
    const wingAng = lerp(-0.2, 1.1, flap);
    ctx.save();
    ctx.translate(b.x, b.y - b.size * 0.25);
    ctx.scale(b.heading, 1);
    const s = b.size;
    ctx.fillStyle = b.pal.wing;
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, -s * 0.05, s * 0.55, s * 0.22, -wingAng, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.32, -0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal.belly;
    ctx.beginPath();
    ctx.ellipse(s * 0.05, s * 0.08, s * 0.35, s * 0.18, -0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal.body;
    ctx.beginPath();
    ctx.arc(s * 0.42, -s * 0.12, s * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal.beak;
    ctx.beginPath();
    ctx.moveTo(s * 0.58, -s * 0.1);
    ctx.lineTo(s * 0.82, -s * 0.04);
    ctx.lineTo(s * 0.58, s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * 0.48, -s * 0.16, s * 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.pal.wing;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, 0);
    ctx.lineTo(-s * 0.9, -s * 0.15);
    ctx.lineTo(-s * 0.7, 0.05 * s);
    ctx.closePath();
    ctx.fill();
    if (b.state === 'perch') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.28);
      ctx.lineTo(-s * 0.05, s * 0.42);
      ctx.moveTo(s * 0.12, s * 0.28);
      ctx.lineTo(s * 0.12, s * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
