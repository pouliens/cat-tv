import { clamp, easeOut, lerp, rand, TAU } from '../utils.js';

const DIVE = .45, SURFACE = .55;

// A still pool of light. Paint at low resolution once, then scale it behind the fish.
function paintWater(w, h) {
  const water = document.createElement('canvas');
  const scale = Math.min(1, 440 / Math.max(w, h));
  water.width = Math.max(1, Math.round(w * scale));
  water.height = Math.max(1, Math.round(h * scale));
  const ctx = water.getContext('2d');
  const pixels = ctx.createImageData(water.width, water.height);
  const shortEdge = Math.min(water.width, water.height);
  for (let y = 0; y < water.height; y++) {
    for (let x = 0; x < water.width; x++) {
      const u = x / water.width, v = y / water.height;
      const a = x / shortEdge * 26, b = y / shortEdge * 26;
      const waves = Math.cos(a + .9 * Math.sin(b * .8)) + Math.cos(b + 1.2 * Math.sin(a * .7));
      const glint = Math.exp(-8 * Math.abs(waves + .45 * Math.sin((a + b) * .55)));
      const light = Math.exp(-3.6 * ((u - .40) ** 2 + (v - .36) ** 2));
      const i = 4 * (y * water.width + x);
      pixels.data[i] = 78 + 73 * light + 8 * glint;
      pixels.data[i + 1] = 169 + 45 * light + 6 * glint;
      pixels.data[i + 2] = 218 + 21 * light + 4 * glint;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return water;
}

export class GoldfishScene {
  constructor({ audio } = {}) {
    this.audio = audio;
    this.heading = -.55;
    this.beat = 0;
    this.dart = 0;
    // swim -> diving -> hidden -> surfacing -> swim, when a paw lands on the fish
    this.mode = 'swim';
    this.modeTime = 0;
    this.hideFor = 0;
    this.food = null;
    this.ripples = [];
    this.drops = [];
    this.bubbles = [];
    this.foam = [];
  }

  setMode(mode) {
    this.mode = mode;
    this.modeTime = 0;
  }

  ripple(x, y, { size = 1, delay = 0, life = 1.3, strength = 1 } = {}) {
    this.ripples.push({ x, y, age: -delay, life, reach: this.length * 1.1 * size, strength });
  }

  bubbleBurst(x, y, count, spread = .25) {
    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: x + rand(-1, 1) * this.length * spread,
        y: y + rand(-1, 1) * this.length * spread,
        r: rand(.018, .045) * this.length,
        age: -rand(0, .5),
        life: rand(.7, 1.3),
        drift: rand(-.08, .08) * this.length,
      });
    }
  }

  splash(x, y) {
    for (let i = 0; i < 26; i++) {
      const angle = rand(0, TAU), speed = rand(.9, 2.8) * this.length;
      this.drops.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        z: 0, vz: rand(.8, 2.2) * this.length, r: rand(.018, .042) * this.length,
      });
    }
    this.foam.push({ x, y, age: 0, life: 1.1 });
    this.ripple(x, y, { size: 1.5, strength: 1.3, life: 1.5 });
    this.ripple(x, y, { size: 2.3, delay: .18, life: 1.8 });
    this.ripple(x, y, { size: 3.1, delay: .4, life: 2.1, strength: .7 });
    this.bubbleBurst(x, y, 14, .3);
  }

  resize(w, h) {
    if (this.w === w && this.h === h) return;
    const u = this.w ? this.x / this.w : .52;
    const v = this.h ? this.y / this.h : .52;
    this.w = w;
    this.h = h;
    this.length = Math.min(w, h) * .31;
    this.margin = this.length * .75;
    this.x = clamp(u * w, this.margin, w - this.margin);
    this.y = clamp(v * h, this.margin, h - this.margin);
    this.water = paintWater(w, h);
    this.cruise();
  }

  start() {}

  cruise() {
    const m = this.margin;
    let x = rand(m, this.w - m);
    let y = rand(m, this.h - m);
    if (Math.hypot(x - this.x, y - this.y) < this.length) {
      x = this.x < this.w / 2 ? this.w - m : m;
      y = this.y < this.h / 2 ? this.h - m : m;
    }
    this.setCourse(x, y);
  }

  setCourse(x, y) {
    const dx = x - this.x, dy = y - this.y;
    const distance = Math.hypot(dx, dy);
    const reach = Math.min(distance * .43, this.length * 1.3);
    const bend = rand(-.23, .23);
    const m = this.margin;
    this.route = [
      { x: this.x, y: this.y },
      { x: clamp(this.x + Math.cos(this.heading) * reach, m, this.w - m),
        y: clamp(this.y + Math.sin(this.heading) * reach, m, this.h - m) },
      { x: clamp(this.x + dx * .65 - dy * bend, m, this.w - m),
        y: clamp(this.y + dy * .65 + dx * bend, m, this.h - m) },
      { x, y },
    ];
    this.progress = 0;
    this.duration = Math.max(1.4, distance / (this.length * .44));
  }

  tap(x, y) {
    const m = this.margin;
    const dx = this.x - x, dy = this.y - y;
    const distance = Math.hypot(dx, dy);
    const swimming = this.mode === 'swim';

    if (swimming && distance <= this.length * .9) {
      // Caught! Splash and dive out of sight; it comes back somewhere else.
      this.splash(this.x, this.y);
      this.audio?.sound('splash');
      this.food = null;
      this.hideFor = rand(1.5, 2.5);
      this.lastTap = { x, y };
      this.setMode('diving');
      return;
    }

    this.ripple(x, y, { size: .9 });
    this.ripple(x, y, { size: 1.4, delay: .16, strength: .6 });
    if (!swimming) {
      this.audio?.sound('plip');
      return;
    }

    if (distance <= this.length * 2.1) {
      // Too close for comfort: dart away from the paw, leaving a wake.
      const angle = dx || dy ? Math.atan2(dy, dx) : this.heading;
      const stride = this.length * 2.3;
      const destX = clamp(this.x + Math.cos(angle) * stride, m, this.w - m);
      const destY = clamp(this.y + Math.sin(angle) * stride, m, this.h - m);
      if (Math.hypot(destX - this.x, destY - this.y) < this.length * .5) this.cruise();
      else this.setCourse(destX, destY);
      this.food = null;
      this.dart = 1.3;
      this.wakeTimer = 0;
      this.audio?.sound('swish');
    } else {
      // Something landed in the water: swim over and investigate.
      this.audio?.sound('plip');
      this.food = { x: clamp(x, m, this.w - m), y: clamp(y, m, this.h - m) };
      this.setCourse(this.food.x, this.food.y);
      this.dart = .5;
    }
  }

  // Resurface far from where the paw last landed.
  resurface() {
    const m = this.margin, from = this.lastTap ?? { x: this.x, y: this.y };
    let best = null, bestScore = -1;
    for (let i = 0; i < 8; i++) {
      const x = rand(m, this.w - m), y = rand(m, this.h - m);
      const score = Math.hypot(x - from.x, y - from.y);
      if (score > bestScore) { best = { x, y }; bestScore = score; }
    }
    this.x = best.x;
    this.y = best.y;
    this.heading = rand(0, TAU);
    this.ripple(this.x, this.y, { size: 1.2, strength: 1.1 });
    this.ripple(this.x, this.y, { size: 1.9, delay: .2, strength: .6 });
    this.bubbleBurst(this.x, this.y, 8, .2);
    this.audio?.sound('surface');
    this.cruise();
    this.setMode('surfacing');
  }

  updateEffects(dt) {
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < r.life);
    for (const b of this.bubbles) { b.age += dt; b.x += b.drift * dt; }
    this.bubbles = this.bubbles.filter((b) => b.age < b.life);
    for (const f of this.foam) f.age += dt;
    this.foam = this.foam.filter((f) => f.age < f.life);
    const gravity = this.length * 7;
    for (const d of this.drops) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vz -= gravity * dt;
      d.z += d.vz * dt;
      if (d.z <= 0 && d.vz < 0) {
        d.gone = true;
        this.ripple(d.x, d.y, { size: .25, life: .6, strength: .8 });
      }
    }
    this.drops = this.drops.filter((d) => !d.gone);
  }

  update(dt) {
    this.updateEffects(dt);
    this.modeTime += dt;
    if (this.mode === 'diving' && this.modeTime >= DIVE) this.setMode('hidden');
    if (this.mode === 'hidden') {
      if (this.modeTime >= this.hideFor) this.resurface();
      return;
    }
    if (this.mode === 'surfacing' && this.modeTime >= SURFACE) this.setMode('swim');

    // A fast dart leaves small wake rings behind the tail.
    if (this.dart > .4) {
      this.wakeTimer = (this.wakeTimer ?? 0) - dt;
      if (this.wakeTimer <= 0) {
        this.wakeTimer = .09;
        const back = this.length * .45;
        this.ripple(this.x - Math.cos(this.heading) * back, this.y - Math.sin(this.heading) * back,
          { size: .45, life: .9, strength: .7 });
      }
    }

    this.dart = Math.max(0, this.dart - dt);
    this.beat += dt * (5.4 + 8 * this.dart);
    this.progress = Math.min(1, this.progress + dt * (1 + 3 * this.dart) / this.duration);
    const t = this.progress, s = 1 - t;
    const [a, b, c, d] = this.route;
    const vx = s * s * (b.x - a.x) + 2 * s * t * (c.x - b.x) + t * t * (d.x - c.x);
    const vy = s * s * (b.y - a.y) + 2 * s * t * (c.y - b.y) + t * t * (d.y - c.y);
    if (Math.hypot(vx, vy) > .01) this.heading = Math.atan2(vy, vx);
    const weights = [s ** 3, 3 * s * s * t, 3 * s * t * t, t ** 3];
    this.x = weights[0] * a.x + weights[1] * b.x + weights[2] * c.x + weights[3] * d.x;
    this.y = weights[0] * a.y + weights[1] * b.y + weights[2] * c.y + weights[3] * d.y;
    if (t === 1) {
      if (this.food) {
        const mouth = this.length * .3;
        const nx = this.x + Math.cos(this.heading) * mouth, ny = this.y + Math.sin(this.heading) * mouth;
        this.bubbleBurst(nx, ny, 6, .08);
        this.ripple(nx, ny, { size: .5, life: .9 });
        this.audio?.sound('nibble');
        this.food = null;
      } else {
        this.audio?.cue();
      }
      this.cruise();
    }
  }

  // How visible and how big the fish is while it dives or comes back up.
  presence() {
    if (this.mode === 'diving') {
      const k = easeOut(Math.min(1, this.modeTime / DIVE));
      return { alpha: 1 - k, size: 1 - .45 * k };
    }
    if (this.mode === 'surfacing') {
      const k = easeOut(Math.min(1, this.modeTime / SURFACE));
      return { alpha: k, size: .55 + .45 * k };
    }
    return { alpha: 1, size: 1 };
  }

  draw(ctx) {
    ctx.drawImage(this.water, 0, 0, this.w, this.h);
    this.drawBubbles(ctx);
    if (this.mode !== 'hidden') this.drawFish(ctx);
    this.drawRipples(ctx);
    this.drawSplash(ctx);
  }

  drawFish(ctx) {
    const { alpha, size } = this.presence();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    const scale = this.length / 119 * size;
    ctx.scale(scale, scale);
    ctx.translate(3, 8);
    ctx.rotate(this.heading);
    ctx.scale(1, .36);
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
    shadow.addColorStop(0, 'rgba(31,92,116,.20)');
    shadow.addColorStop(1, 'rgba(31,92,116,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(-45, -45, 90, 90);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    ctx.scale(scale, scale);
    const root = 4 * Math.sin(this.beat);
    const tip = 14 * Math.sin(this.beat - .7);
    this.drawTail(ctx, root, tip);
    this.drawBody(ctx, root);
    ctx.restore();
  }

  // Bright, high-contrast rings so a tap reads clearly on a TV across the room.
  drawRipples(ctx) {
    ctx.save();
    for (const r of this.ripples) {
      if (r.age < 0) continue;
      const k = r.age / r.life;
      const radius = r.reach * easeOut(k);
      const fade = (1 - k) ** 1.4 * r.strength;
      const width = Math.max(1.5, this.length * .035 * (1 - k * .6));
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, TAU);
      ctx.strokeStyle = `rgba(24,86,122,${.32 * fade})`;
      ctx.lineWidth = width * 2.2;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${.85 * fade})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBubbles(ctx) {
    ctx.save();
    for (const b of this.bubbles) {
      if (b.age < 0) continue;
      const k = b.age / b.life;
      const r = b.r * (.6 + .6 * k);
      ctx.globalAlpha = Math.sin(Math.PI * k) * .9;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.fillStyle = 'rgba(230,248,255,.35)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, r * .22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x - r * .35, b.y - r * .35, r * .25, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.restore();
  }

  drawSplash(ctx) {
    ctx.save();
    for (const f of this.foam) {
      const k = f.age / f.life;
      const r = this.length * (.35 + .5 * easeOut(k));
      const foam = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      foam.addColorStop(0, `rgba(255,255,255,${.9 * (1 - k)})`);
      foam.addColorStop(.6, `rgba(235,250,255,${.55 * (1 - k)})`);
      foam.addColorStop(1, 'rgba(235,250,255,0)');
      ctx.fillStyle = foam;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, TAU);
      ctx.fill();
    }
    for (const d of this.drops) {
      // Shadow on the water, then the droplet lifted toward the viewer by its height.
      const lift = d.z * .35, grow = 1 + d.z / (this.length * 2);
      ctx.fillStyle = 'rgba(24,86,122,.25)';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath();
      ctx.arc(d.x, d.y - lift, d.r * grow, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTail(ctx, root, tip) {
    const tail = ctx.createLinearGradient(-81, 0, -32, 0);
    tail.addColorStop(0, 'rgba(255,159,72,.60)');
    tail.addColorStop(1, '#ed7625');
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(-33, root - 3);
    ctx.bezierCurveTo(-48, root - 2, -61, tip - 17, -80, tip - 19);
    ctx.quadraticCurveTo(-72, tip - 8, -61, tip);
    ctx.quadraticCurveTo(-74, tip + 11, -78, tip + 21);
    ctx.bezierCurveTo(-57, tip + 15, -48, root + 4, -33, root + 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,219,146,.46)';
    ctx.lineWidth = .65;
    for (const ray of [-16, -10, 9, 16]) {
      ctx.beginPath();
      ctx.moveTo(-37, root);
      ctx.quadraticCurveTo(-52, lerp(root, tip, .58), -72, tip + ray);
      ctx.stroke();
    }
  }

  drawBody(ctx, root) {
    for (const side of [-1, 1]) {
      const fan = 2 * Math.sin(this.beat * .7);
      ctx.fillStyle = 'rgba(255,168,79,.76)';
      ctx.beginPath();
      ctx.moveTo(11, side * 9);
      ctx.quadraticCurveTo(8, side * 19, -4 + fan, side * 23);
      ctx.quadraticCurveTo(-4, side * 15, 3, side * 9);
      ctx.fill();
    }
    const colour = ctx.createLinearGradient(0, -15, 0, 15);
    colour.addColorStop(0, '#ffc371');
    colour.addColorStop(.34, '#f88325');
    colour.addColorStop(.60, '#de581a');
    colour.addColorStop(1, '#ffac50');
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(38, 0);
    ctx.bezierCurveTo(38, -10, 24, -16, 8, -14);
    ctx.bezierCurveTo(-12, -13, -26, root - 5, -39, root - 2);
    ctx.quadraticCurveTo(-43, root, -39, root + 2);
    ctx.bezierCurveTo(-25, root + 5, -10, 14, 10, 14);
    ctx.bezierCurveTo(25, 15, 37, 10, 38, 0);
    ctx.fill();

    // Fine overlapping scales on the back, with the tail remaining translucent.
    ctx.fillStyle = 'rgba(170,62,16,.12)';
    for (const [x, y, radius] of [[-15, 1, 4], [-4, -4, 5], [4, 3, 5], [13, -3, 4], [22, 2, 3]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.6, radius, -.3, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,209,116,.35)';
    ctx.lineWidth = .7;
    for (let row = -2; row <= 2; row++) {
      const y = row * 3.7;
      for (let x = -22 + Math.abs(row) * 4; x < 16; x += 5) {
        const offset = (Math.abs(row) % 2) * 2 + x;
        ctx.beginPath();
        ctx.moveTo(offset, y - 2.2);
        ctx.quadraticCurveTo(offset - 3.5, y, offset, y + 2.2);
        ctx.stroke();
      }
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#f9b250';
      ctx.beginPath();
      ctx.ellipse(27.7, side * 9.5, 4, 3.4, side * .35, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#32271e';
      ctx.beginPath();
      ctx.arc(28, side * 10, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff5ce';
      ctx.beginPath();
      ctx.arc(28.8, side * 10 - .6, .7, 0, TAU);
      ctx.fill();
    }
  }
}
