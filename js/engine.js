export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.scene = null;
    this.running = false;
    this.last = 0;
    this.cssW = 0;
    this.cssH = 0;
    this.dpr = 1;
    this.raf = 0;
    this.onFrame = null;
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
  }

  resize() {
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);
    // Render at most a Full HD long edge and keep scene density consistent on 4K TVs.
    const scale = Math.min(1, 1920 / Math.max(cssW, cssH));
    this.cssW = Math.round(cssW * scale);
    this.cssH = Math.round(cssH * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 1920 / Math.max(this.cssW, this.cssH));
    this.dpr = dpr;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scene?.resize?.(this.cssW, this.cssH);
  }

  setScene(scene) {
    this.scene?.stop?.();
    this.contact = null;
    this.scene = scene;
    scene?.resize?.(this.cssW, this.cssH);
    scene?.start?.();
  }

  tap(clientX, clientY) {
    if (!this.running || !this.scene) return;
    const box = this.canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (clientX - box.left) * this.cssW / box.width;
    const y = (clientY - box.top) * this.cssH / box.height;
    this.contact = { x, y, age: 0 };
    this.scene.tap?.(x, y);
  }

  drawContact(dt) {
    const contact = this.contact;
    if (!contact) return;
    contact.age += dt;
    const progress = contact.age / .42;
    if (progress >= 1) {
      this.contact = null;
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = .7 * (1 - progress);
    ctx.beginPath();
    ctx.arc(contact.x, contact.y, 8 + 26 * progress, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, .45)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.1) dt = 0.1;
      const { ctx } = this;
      this.scene?.update?.(dt);
      this.scene?.draw?.(ctx);
      this.drawContact(dt);
      this.onFrame?.(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
