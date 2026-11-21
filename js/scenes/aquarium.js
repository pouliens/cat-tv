import { nearestTo, choice, lerp, rand, randInt, TAU } from '../utils.js';

const FISH_PALETTES = [
  { body: '#f28c28', belly: '#ffd89a', fin: '#d4550a', stripe: '#fff4d6' },
  { body: '#ff4d4d', belly: '#ffe1c7', fin: '#c0392b', stripe: '#ffffff' },
  { body: '#2ad4c9', belly: '#d6fff7', fin: '#148f8a', stripe: '#ff4dad' },
  { body: '#f2d022', belly: '#fff4b0', fin: '#d4a017', stripe: '#3a2a00' },
  { body: '#3d7eff', belly: '#cfe3ff', fin: '#1d4ed8', stripe: '#ffe37a' },
  { body: '#c084fc', belly: '#f3e8ff', fin: '#7c3aed', stripe: '#ffffff' },
  { body: '#ffffff', belly: '#fff7ed', fin: '#ef4444', stripe: '#ef4444' },
];

export class AquariumScene {
  constructor({ audio }) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.fish = [];
    this.weed = [];
    this.bubbles = [];
    this.bubbleTimer = 0;
    this.soundTimer = 0;
  }

  resize(w, h) {
    const first = this.w === 800 && this.h === 600 && this.fish.length === 0;
    this.w = w;
    this.h = h;
    if (first || this.fish.length === 0) this._spawn();
  }

  start() {
    if (!this.fish.length) this._spawn();
  }

  stop() {}

  _spawn() {
    const { w, h } = this;
    this.weed = [];
    const stalks = Math.max(7, Math.round(w / 140));
    for (let i = 0; i < stalks; i++) {
      this.weed.push({
        x: (i + 0.3) * (w / stalks) + rand(-20, 20),
        h: rand(h * 0.22, h * 0.5),
        segs: randInt(6, 10),
        phase: rand(0, TAU),
        speed: rand(0.6, 1.3),
        color: choice(['#0d5c3a', '#147a4b', '#0a472c', '#1b8f58', '#0f6a40']),
        width: rand(8, 16),
      });
    }
    this.fish = [];
    const n = Math.max(10, Math.round(w / 90));
    for (let i = 0; i < n; i++) {
      const pal = choice(FISH_PALETTES);
      const z = rand(0.35, 1);
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.fish.push({
        x: rand(0, w),
        y: rand(h * 0.1, h * 0.78),
        z,
        len: lerp(22, 70, z) * rand(0.85, 1.15),
        dir,
        speed: lerp(22, 70, z) * rand(0.7, 1.2) * dir,
        baseSpeed: 0,
        pal,
        phase: rand(0, TAU),
        flap: rand(8, 14),
        dart: 0,
        dartCd: rand(2, 8),
        kind: choice(['stripe', 'spot', 'plain', 'stripe']),
        wobble: rand(8, 18),
      });
      this.fish[i].baseSpeed = this.fish[i].speed;
    }
    this.fish.sort((a, b) => a.z - b.z);
    this.bubbles = [];
    for (let i = 0; i < 18; i++) this._addBubble(true);
  }

  _addBubble(anywhere) {
    this.bubbles.push({
      x: rand(this.w * 0.05, this.w * 0.95),
      y: anywhere ? rand(0, this.h) : this.h + rand(0, 30),
      r: rand(2, 8),
      vy: rand(18, 46),
      phase: rand(0, TAU),
    });
  }

  tap(x, y) {
    const fish = nearestTo(this.fish, x, y);
    fish.dir = fish.x >= x ? 1 : -1;
    fish.baseSpeed = Math.abs(fish.baseSpeed) * fish.dir;
    fish.speed = fish.baseSpeed * 4;
    fish.dart = .6;
    fish.dartCd = 3;
    // A small cluster marks the contact even when the fish are far away.
    for (let i = 0; i < 3; i++) {
      this.bubbles.push({ x: x + rand(-9, 9), y, r: rand(3, 7), vy: rand(40, 65), phase: rand(0, TAU) });
    }
    if (this.bubbles.length > 100) this.bubbles.splice(0, this.bubbles.length - 100);
  }

  update(dt) {
    this.t += dt;
    const { w, h } = this;
    for (const f of this.fish) {
      f.dartCd -= dt;
      if (f.dart > 0) {
        f.dart -= dt;
        if (f.dart <= 0) f.speed = f.baseSpeed;
      } else if (f.dartCd <= 0) {
        f.dart = rand(0.25, 0.55);
        f.dartCd = rand(3.5, 10);
        f.speed = f.baseSpeed * rand(3.2, 5);
        f.y += rand(-18, 18);
      }
      f.x += f.speed * dt;
      f.y += Math.sin(this.t * 1.4 + f.phase) * f.wobble * dt;
      f.y = Math.max(h * 0.08, Math.min(h * 0.82, f.y));
      const margin = f.len * 1.2;
      if (f.dir > 0 && f.x > w + margin) {
        f.x = -margin;
        f.y = rand(h * 0.1, h * 0.78);
      } else if (f.dir < 0 && f.x < -margin) {
        f.x = w + margin;
        f.y = rand(h * 0.1, h * 0.78);
      }
    }
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this._addBubble(false);
      if (Math.random() < 0.35) this._addBubble(false);
      this.bubbleTimer = rand(0.12, 0.4);
    }
    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(this.t * 2 + b.phase) * 12 * dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.y + b.r > -10);
    this.soundTimer -= dt;
    if (this.soundTimer <= 0) {
      if (Math.random() < 0.7) this.audio?.cue();
      this.soundTimer = rand(1.6, 4.2);
    }
  }

  draw(ctx) {
    const { w, h, t } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#08324a');
    g.addColorStop(0.45, '#0b5a6e');
    g.addColorStop(0.82, '#0a3d4a');
    g.addColorStop(1, '#2a2416');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 7; i++) {
      const x = w * (0.1 + i * 0.13);
      const sway = Math.sin(t * 0.3 + i) * 30;
      ctx.fillStyle = i % 2 ? '#b8ecff' : '#fff6c2';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40 + sway, 0);
      ctx.lineTo(x + sway * 0.4, h * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    this._drawSand(ctx);
    for (const s of this.weed) this._drawWeed(ctx, s);
    for (const f of this.fish) this._drawFish(ctx, f);
    for (const b of this.bubbles) this._drawBubble(ctx, b);
  }

  _drawSand(ctx) {
    const { w, h } = this;
    ctx.fillStyle = '#c9b27a';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) {
      const y = h - 28 - Math.sin(x * 0.02) * 7 - Math.sin(x * 0.05) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(80, 60, 30, 0.25)';
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % w;
      const y = h - 10 - ((i * 13) % 16);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }
  }

  _drawWeed(ctx, s) {
    const { t, h } = this;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    let x = s.x;
    let y = h - 24;
    ctx.moveTo(x, y);
    const segH = s.h / s.segs;
    for (let i = 1; i <= s.segs; i++) {
      const sway = Math.sin(t * s.speed + s.phase + i * 0.45) * (6 + i * 3.2);
      x = s.x + sway;
      y = h - 24 - i * segH;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180, 255, 200, 0.18)';
    ctx.lineWidth = Math.max(2, s.width * 0.25);
    ctx.stroke();
  }

  _drawFish(ctx, f) {
    const dir = f.dir;
    const flap = Math.sin(this.t * f.flap + f.phase);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);
    const L = f.len;
    const bodyH = L * 0.42;

    ctx.fillStyle = f.pal.fin;
    ctx.beginPath();
    ctx.moveTo(-L * 0.15, 0);
    ctx.quadraticCurveTo(-L * 0.05, -bodyH * (0.9 + flap * 0.15), L * 0.15, -bodyH * 0.7);
    ctx.lineTo(L * 0.05, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(L * 0.05, 0, L * 0.42, bodyH * 0.55, 0, 0, TAU);
    ctx.fillStyle = f.pal.body;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(L * 0.08, bodyH * 0.15, L * 0.32, bodyH * 0.32, 0, 0, TAU);
    ctx.fillStyle = f.pal.belly;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = f.pal.fin;
    ctx.beginPath();
    ctx.moveTo(-L * 0.32, 0);
    ctx.lineTo(-L * 0.62, -bodyH * (0.45 + flap * 0.25));
    ctx.lineTo(-L * 0.52, 0);
    ctx.lineTo(-L * 0.62, bodyH * (0.45 - flap * 0.25));
    ctx.closePath();
    ctx.fill();

    if (f.kind === 'stripe') {
      ctx.strokeStyle = f.pal.stripe;
      ctx.lineWidth = Math.max(1.5, L * 0.05);
      ctx.globalAlpha = 0.7;
      for (let i = -1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(L * 0.02 + i * L * 0.12, 0, bodyH * 0.35, -0.8, 0.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (f.kind === 'spot') {
      ctx.fillStyle = f.pal.stripe;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(L * 0.12 + L * 0.07, -bodyH * 0.08);
      ctx.arc(L * 0.12, -bodyH * 0.08, L * 0.07, 0, TAU);
      ctx.moveTo(-L * 0.02 + L * 0.05, bodyH * 0.1);
      ctx.arc(-L * 0.02, bodyH * 0.1, L * 0.05, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(L * 0.32, -bodyH * 0.08, Math.max(2, L * 0.07), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#102030';
    ctx.beginPath();
    ctx.arc(L * 0.34, -bodyH * 0.08, Math.max(1, L * 0.035), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  _drawBubble(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = 'rgba(210, 240, 255, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210, 240, 255, 0.12)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-b.r * 0.3, -b.r * 0.3, Math.max(0.8, b.r * 0.25), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
