import { lerp, TAU } from '../utils.js';

const CYCLE = 6.4;

export class IntroScene {
  constructor({ audio }) {
    this.audio = audio;
    this.w = 800;
    this.h = 600;
    this.t = 0;
    this.playedSting = false;
    this.streaks = [];
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    if (!this.streaks.length) this._initStreaks();
  }

  start() {
    this.t = 0.15;
    this.playedSting = false;
    this._initStreaks();
  }

  stop() {}

  _initStreaks() {
    this.streaks = [];
    for (let i = 0; i < 18; i++) {
      this.streaks.push({
        x: Math.random(),
        y: Math.random(),
        len: 0.15 + Math.random() * 0.5,
        w: 1 + Math.random() * 4,
        speed: 0.4 + Math.random() * 1.2,
        hue: 350 + Math.random() * 25,
        a: 0.25 + Math.random() * 0.5,
      });
    }
  }

  update(dt) {
    this.t += dt;
    if (this.t >= CYCLE) {
      this.t -= CYCLE;
      this.playedSting = false;
    }
    const p = this.t / CYCLE;
    if (!this.playedSting && p >= 0.28) {
      this.playedSting = true;
      this.audio?.introSting?.();
    }
  }

  draw(ctx) {
    const { w, h } = this;
    const p = this.t / CYCLE;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Streaking colour lines during the reveal/hold
    if (p > 0.12 && p < 0.82) {
      const fade = p < 0.25 ? (p - 0.12) / 0.13 : p > 0.7 ? (0.82 - p) / 0.12 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade) * 0.7;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.18);
      for (const s of this.streaks) {
        const x = (s.x + this.t * s.speed * 0.08) % 1.4 - 0.2;
        ctx.strokeStyle = `hsl(${s.hue} 90% 55%)`;
        ctx.lineWidth = s.w;
        ctx.globalAlpha = Math.max(0, fade) * s.a;
        ctx.beginPath();
        ctx.moveTo((x - s.len) * w, (s.y - 0.5) * h * 1.3);
        ctx.lineTo(x * w, (s.y - 0.5) * h * 1.3);
        ctx.stroke();
      }
      ctx.restore();
    }

    const size = Math.min(w, h) * 0.42;
    const cx = w / 2;
    const cy = h * 0.46;

    // Line grows, then ribbon draws the M, then it holds and fades
    let line = 0;
    let ribbon = 0;
    let punch = 1;
    let fade = 1;
    if (p < 0.12) {
      line = p / 0.12;
    } else if (p < 0.28) {
      line = 1;
      ribbon = (p - 0.12) / 0.16;
    } else if (p < 0.72) {
      line = 1;
      ribbon = 1;
      const k = Math.min(1, (p - 0.28) / 0.06);
      punch = 1 + Math.sin(k * Math.PI) * 0.08;
    } else {
      line = 1;
      ribbon = 1;
      fade = Math.max(0, 1 - (p - 0.72) / 0.2);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(punch, punch);
    ctx.globalAlpha = fade;

    if (line > 0 && ribbon < 1) {
      ctx.strokeStyle = '#e50914';
      ctx.lineWidth = Math.max(4, size * 0.035);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const half = size * 0.55 * line;
      ctx.moveTo(-half, size * 0.08);
      ctx.lineTo(half, size * 0.08);
      ctx.stroke();
    }

    if (ribbon > 0) {
      this._drawM(ctx, size, ribbon, fade);
    }
    ctx.restore();

    if (ribbon > 0.85 && fade > 0) {
      ctx.save();
      ctx.globalAlpha = fade * Math.min(1, (ribbon - 0.85) / 0.15);
      ctx.fillStyle = '#f2f2f2';
      ctx.font = `700 ${Math.floor(size * 0.14)}px Outfit, Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.letterSpacing = '0.28em';
      ctx.fillText('MEOW', w / 2, cy + size * 0.62);
      ctx.restore();
    }
  }

  _drawM(ctx, size, progress, fade) {
    const w = size * 0.95;
    const h = size * 1.05;
    const thick = size * 0.16;
    // Ribbon path: L bottom -> L top -> crotch -> R top -> R bottom
    const pts = [
      [-w * 0.5, h * 0.5],
      [-w * 0.5, -h * 0.5],
      [0, h * 0.12],
      [w * 0.5, -h * 0.5],
      [w * 0.5, h * 0.5],
    ];
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0];
      const dy = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dy);
      segs.push({ a: pts[i], b: pts[i + 1], len });
      total += len;
    }
    const drawLen = total * progress;

    ctx.lineJoin = 'miter';
    ctx.miterLimit = 8;
    ctx.lineCap = 'butt';
    ctx.lineWidth = thick;
    ctx.shadowColor = 'rgba(229, 9, 20, 0.8)';
    ctx.shadowBlur = size * 0.12 * fade;

    const drawPartial = (color, width, offset = 0) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      let remain = drawLen;
      let started = false;
      for (const s of segs) {
        if (remain <= 0) break;
        const t = Math.min(1, remain / s.len);
        const x = lerp(s.a[0], s.b[0], t);
        const y = lerp(s.a[1], s.b[1], t) + offset;
        if (!started) {
          ctx.moveTo(s.a[0], s.a[1] + offset);
          started = true;
        }
        ctx.lineTo(x, y);
        remain -= s.len;
      }
      ctx.stroke();
    };

    drawPartial('#8a0610', thick + 6);
    drawPartial('#e50914', thick);
    drawPartial('#ff6b73', Math.max(3, thick * 0.28), -thick * 0.18);
  }
}
