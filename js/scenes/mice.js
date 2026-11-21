import { nearestTo, choice, lerp, rand, TAU } from '../utils.js';

export class MiceScene {
  constructor({ audio }) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.mice = [];
    this.spots = [];
    this.soundT = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this._layout();
    if (!this.mice.length) this._spawn();
  }

  start() {
    if (!this.mice.length) this._spawn();
  }

  stop() {}

  _layout() {
    const { w, h } = this;
    this.baseY = h * 0.78;
    this.spots = [
      { x: w * 0.08, y: this.baseY, type: 'hole' },
      { x: w * 0.92, y: this.baseY, type: 'hole' },
      { x: w * 0.32, y: this.baseY - 4, type: 'box' },
      { x: w * 0.62, y: this.baseY - 4, type: 'pot' },
      { x: w * 0.5, y: this.baseY, type: 'hole' },
    ];
  }

  _spawn() {
    this.mice = [];
    const n = 4;
    for (let i = 0; i < n; i++) {
      const spot = this.spots[i % this.spots.length];
      this.mice.push({
        x: spot.x,
        y: spot.y,
        tx: spot.x,
        ty: spot.y,
        state: choice(['hide', 'peek', 'run']),
        wait: rand(0.2, 1.5),
        dir: Math.random() < 0.5 ? -1 : 1,
        color: choice(['#7a7268', '#9a8b78', '#5c534c', '#b08a6a']),
        size: rand(22, 32),
        phase: rand(0, TAU),
        path: [],
        hideSpot: spot,
        peek: 0,
      });
      if (this.mice[i].state === 'hide') this.mice[i].peek = 0;
      if (this.mice[i].state === 'peek') this.mice[i].peek = 1;
    }
  }

  _runTo(m, spot) {
    m.state = 'run';
    m.tx = spot.x + rand(-8, 8);
    m.ty = spot.y;
    m.hideSpot = spot;
    m.wait = 8;
    this.soundT = 0;
  }

  tap(x, y) {
    const visible = this.mice.filter(mouse => mouse.state !== 'hide');
    const mouse = nearestTo(visible.length ? visible : this.mice, x, y);
    const exits = this.spots.filter(spot => Math.abs(spot.x - mouse.x) > this.w * .12);
    const farSide = x < mouse.x ? this.w : 0;
    this._runTo(mouse, nearestTo(exits, farSide, this.baseY));
  }

  update(dt) {
    this.t += dt;
    this.soundT -= dt;
    for (const m of this.mice) {
      m.wait -= dt;
      if (m.state === 'hide') {
        m.peek = Math.max(0, m.peek - dt * 3);
        m.x = m.hideSpot.x;
        m.y = m.hideSpot.y;
        if (m.wait <= 0) {
          if (Math.random() < 0.65) {
            m.state = 'peek';
            m.wait = rand(0.8, 2.2);
          } else {
            const dest = choice(this.spots.filter((s) => s !== m.hideSpot));
            this._runTo(m, dest);
          }
        }
      } else if (m.state === 'peek') {
        m.peek = Math.min(1, m.peek + dt * 2.4);
        m.x = m.hideSpot.x;
        m.y = m.hideSpot.y;
        m.dir = m.x < this.w / 2 ? 1 : -1;
        if (m.wait <= 0) {
          if (Math.random() < 0.5) {
            m.state = 'hide';
            m.wait = rand(0.6, 2.5);
          } else {
            const dest = choice(this.spots.filter((s) => s !== m.hideSpot));
            this._runTo(m, dest);
          }
        }
      } else if (m.state === 'run') {
        const dx = m.tx - m.x;
        const dy = m.ty - m.y;
        const d = Math.hypot(dx, dy) || 1;
        const speed = 280;
        m.dir = dx >= 0 ? 1 : -1;
        m.x += (dx / d) * speed * dt;
        m.y += (dy / d) * speed * dt;
        // Slight hop
        m.y += Math.sin(this.t * 28 + m.phase) * 0.4;
        if (this.soundT <= 0) {
          this.audio?.cue();
          this.soundT = rand(0.25, 0.7);
        }
        if (d < 12 || m.wait <= 0) {
          m.x = m.tx;
          m.y = m.ty;
          if (Math.random() < 0.2) {
            // Freeze mid-floor sometimes, then dash
            m.state = 'freeze';
            m.wait = rand(0.25, 0.8);
          } else {
            m.state = Math.random() < 0.5 ? 'peek' : 'hide';
            m.wait = rand(0.8, 2.4);
          }
        }
      } else if (m.state === 'freeze') {
        if (m.wait <= 0) {
          const dest = choice(this.spots);
          this._runTo(m, dest);
        }
      }
    }
  }

  draw(ctx) {
    const { w, h } = this;
    const wall = ctx.createLinearGradient(0, 0, 0, this.baseY);
    wall.addColorStop(0, '#d8c7a8');
    wall.addColorStop(1, '#cbb894');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, this.baseY);

    // Baseboard
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(0, this.baseY - 22, w, 22);
    ctx.fillStyle = '#3e2f22';
    ctx.fillRect(0, this.baseY - 24, w, 3);

    // Floor
    const floor = ctx.createLinearGradient(0, this.baseY, 0, h);
    floor.addColorStop(0, '#c4a574');
    floor.addColorStop(1, '#9a7a4c');
    ctx.fillStyle = floor;
    ctx.fillRect(0, this.baseY, w, h - this.baseY);
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, this.baseY + 10 + i * 18);
      ctx.lineTo(w, this.baseY + 18 + i * 18);
      ctx.stroke();
    }

    this._drawProps(ctx);

    // Sort mice so runners draw in front, hiders behind props... we'll draw hiders/peeks after holes
    const hidden = this.mice.filter((m) => m.state === 'hide' || m.state === 'peek');
    const visible = this.mice.filter((m) => m.state === 'run' || m.state === 'freeze');
    for (const m of visible) this._drawMouse(ctx, m, 1);
    // holes already drawn in props; peeking mice over holes
    for (const m of hidden) {
      if (m.peek > 0.05) this._drawMouse(ctx, m, m.peek);
    }
  }

  _drawProps(ctx) {
    for (const s of this.spots) {
      if (s.type === 'hole') {
        ctx.fillStyle = '#1a120c';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 6, 22, 16, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#3a2a1c';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (s.type === 'box') {
        ctx.fillStyle = '#c48a3a';
        ctx.fillRect(s.x - 48, s.y - 70, 96, 70);
        ctx.fillStyle = '#a36e28';
        ctx.fillRect(s.x - 48, s.y - 78, 96, 12);
        ctx.strokeStyle = 'rgba(80,40,10,0.35)';
        ctx.strokeRect(s.x - 48, s.y - 70, 96, 70);
        // flap gap at bottom to peek
        ctx.fillStyle = '#1a120c';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 4, 16, 8, 0, 0, TAU);
        ctx.fill();
      } else if (s.type === 'pot') {
        ctx.fillStyle = '#3d6b3a';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 100, 28, 50, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a4d28';
        ctx.beginPath();
        ctx.ellipse(s.x + 18, s.y - 110, 16, 30, 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#8a3b32';
        ctx.beginPath();
        ctx.moveTo(s.x - 28, s.y - 50);
        ctx.lineTo(s.x + 28, s.y - 50);
        ctx.lineTo(s.x + 22, s.y);
        ctx.lineTo(s.x - 22, s.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1a120c';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 4, 14, 7, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  _drawMouse(ctx, m, reveal) {
    const s = m.size;
    const run = m.state === 'run';
    const bob = run ? Math.sin(this.t * 28 + m.phase) * 2 : 0;
    ctx.save();
    ctx.translate(m.x, m.y - 6 + bob - (1 - reveal) * s);
    ctx.scale(m.dir, 1);
    ctx.globalAlpha = Math.min(1, reveal * 1.2);

    // tail
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, 0);
    const tw = Math.sin(this.t * (run ? 18 : 4) + m.phase) * 10;
    ctx.quadraticCurveTo(-s * 0.9, tw - 4, -s * 1.25, tw * 0.4);
    ctx.stroke();

    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.28, 0, 0, TAU);
    ctx.fill();
    // ear
    ctx.beginPath();
    ctx.arc(s * 0.25, -s * 0.28, s * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8b0b0';
    ctx.beginPath();
    ctx.arc(s * 0.25, -s * 0.28, s * 0.1, 0, TAU);
    ctx.fill();
    // head
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.ellipse(s * 0.42, -s * 0.05, s * 0.28, s * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * 0.5, -s * 0.1, s * 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1a1a';
    ctx.beginPath();
    ctx.arc(s * 0.68, -0.02 * s, s * 0.05, 0, TAU);
    ctx.fill();
    // whiskers
    ctx.strokeStyle = 'rgba(40,30,20,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.6, 0);
    ctx.lineTo(s * 0.95, -6);
    ctx.moveTo(s * 0.6, 2);
    ctx.lineTo(s * 0.95, 6);
    ctx.stroke();
    ctx.restore();
  }
}
