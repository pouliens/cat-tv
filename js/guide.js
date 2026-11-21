import { createScene, getScene, SCENES } from './scenes/registry.js';

// Render one silent frame from the scene itself. Browsing never starts a second animation loop.
function drawPoster(canvas, id) {
  const scene = createScene(id, {});
  const ctx = canvas.getContext('2d');
  const width = 560;
  const height = width * canvas.height / canvas.width;
  scene.resize(width, height);
  scene.start();
  for (let i = 0; i < 100; i++) scene.update(1 / 40);
  ctx.save();
  ctx.scale(canvas.width / width, canvas.width / width);
  scene.draw(ctx);
  ctx.restore();
  scene.stop?.();
}

export function buildGuide(playScene) {
  const grid = document.getElementById('guide-scenes');
  document.getElementById('scene-count').textContent = SCENES.length + ' scenes';
  for (const scene of SCENES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guide-card';
    button.setAttribute('aria-label', 'Play ' + scene.name);
    const art = document.createElement('canvas');
    art.width = 560;
    art.height = 312;
    art.setAttribute('aria-hidden', 'true');
    drawPoster(art, scene.id);
    const label = document.createElement('span');
    label.className = 'card-label';
    label.textContent = scene.name;
    button.append(art, label);
    button.addEventListener('click', () => playScene(scene.id));
    grid.append(button);
  }
}

export function featureScene(id) {
  const scene = getScene(id);
  document.getElementById('featured-name').textContent = scene.name;
  document.getElementById('featured-blurb').textContent = scene.blurb + '.';
  drawPoster(document.getElementById('featured-art'), id);
}
