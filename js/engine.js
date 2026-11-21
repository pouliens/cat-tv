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
    this.scene = scene;
    scene?.resize?.(this.cssW, this.cssH);
    scene?.start?.();
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
