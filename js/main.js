import { Engine } from './engine.js';
import { AudioEngine } from './audio.js';
import { SCENES, createScene, getScene } from './scenes/registry.js';
import { DURATION_PRESETS, loadSettings, saveSettings, durationMs } from './settings.js';

const params = new URLSearchParams(location.search);
const qs = {
  autostart: params.get('autostart') === '1' || params.get('autostart') === 'true',
  scene: params.get('scene'),
  muted: params.get('sound') === '0' || params.get('muted') === '1',
  nofullscreen: params.get('nofullscreen') === '1' || params.get('fullscreen') === '0',
  hideui: params.get('hideui') === '1',
};

const canvas = document.getElementById('stage');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const settingsEl = document.getElementById('settings');
const sceneToggles = document.getElementById('scene-toggles');
const durationPresets = document.getElementById('duration-presets');
const customWrap = document.getElementById('custom-duration-wrap');
const customInput = document.getElementById('custom-duration');
const shuffleEl = document.getElementById('shuffle');
const soundEl = document.getElementById('sound');
const volumeEl = document.getElementById('volume');
const nowPlaying = document.getElementById('now-playing');
const progressEl = document.getElementById('progress');
const toast = document.getElementById('scene-toast');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnFs = document.getElementById('btn-fullscreen');
const btnClose = document.getElementById('btn-close-settings');

const engine = new Engine(canvas);
const audio = new AudioEngine();
const settings = loadSettings();
if (qs.muted) settings.muted = true;

let playing = false;
let currentId = settings.enabled[0] || SCENES[0].id;
let startedAt = 0;
let hideTimer = 0;
let cursorTimer = 0;
let wakeLock = null;
let toastTimer = 0;

audio.muted = settings.muted;
audio.volume = settings.volume;

function persist() { saveSettings(settings); }

function enabledList() {
  const set = new Set(settings.enabled);
  const list = SCENES.filter((s) => set.has(s.id));
  return list.length ? list : [...SCENES];
}

function showToast(name) {
  if (qs.hideui) return;
  toast.hidden = false;
  toast.textContent = name;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function loadScene(id, { announce = true } = {}) {
  const def = getScene(id);
  currentId = def.id;
  engine.setScene(createScene(def.id, { audio }));
  nowPlaying.textContent = def.name;
  startedAt = performance.now();
  if (announce && playing) showToast(def.name);
}

function nextScene(dir = 1) {
  const list = enabledList();
  if (list.length === 1) {
    loadScene(list[0].id);
    return;
  }
  let id;
  if (settings.shuffle && dir > 0) {
    const others = list.filter((s) => s.id !== currentId);
    id = others[Math.floor(Math.random() * others.length)].id;
  } else {
    const i = Math.max(0, list.findIndex((s) => s.id === currentId));
    id = list[(i + dir + list.length) % list.length].id;
  }
  loadScene(id);
}

async function requestWakeLock() {
  try {
    if (navigator.wakeLock?.request) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch {
    wakeLock = null;
  }
}

async function enterFullscreen() {
  if (qs.nofullscreen) return;
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch {}
}

function toggleFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  } else {
    enterFullscreen();
  }
}

function showSettings() {
  if (qs.hideui) return;
  settingsEl.classList.remove('hidden');
  settingsEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cursor-on');
  bumpIdle();
}

function hideSettings() {
  settingsEl.classList.add('hidden');
  settingsEl.setAttribute('aria-hidden', 'true');
  bumpIdle();
}

function settingsOpen() {
  return !settingsEl.classList.contains('hidden');
}

function bumpIdle() {
  clearTimeout(hideTimer);
  clearTimeout(cursorTimer);
  document.body.classList.add('cursor-on');
  if (!playing) return;
  const active = document.activeElement;
  const hold = active && settingsEl.contains(active) && (active.tagName === 'INPUT' && active.type === 'number');
  hideTimer = setTimeout(() => {
    if (!hold) hideSettings();
  }, 5000);
  cursorTimer = setTimeout(() => {
    if (!settingsOpen()) document.body.classList.remove('cursor-on');
  }, 3000);
}

function buildUi() {
  sceneToggles.innerHTML = '';
  for (const s of SCENES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = s.name;
    btn.title = s.blurb;
    btn.setAttribute('aria-pressed', settings.enabled.includes(s.id) ? 'true' : 'false');
    btn.addEventListener('click', () => {
      const on = settings.enabled.includes(s.id);
      if (on) {
        if (settings.enabled.length === 1) return;
        settings.enabled = settings.enabled.filter((id) => id !== s.id);
      } else {
        settings.enabled = [...settings.enabled, s.id];
      }
      btn.setAttribute('aria-pressed', settings.enabled.includes(s.id) ? 'true' : 'false');
      persist();
      if (!settings.enabled.includes(currentId)) nextScene(1);
      bumpIdle();
    });
    sceneToggles.appendChild(btn);
  }

  durationPresets.innerHTML = '';
  for (const p of DURATION_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.id = p.id;
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      settings.durationId = p.id;
      persist();
      syncDurationUi();
      startedAt = performance.now();
      bumpIdle();
    });
    durationPresets.appendChild(btn);
  }

  shuffleEl.checked = settings.shuffle;
  soundEl.checked = !settings.muted;
  volumeEl.value = String(Math.round(settings.volume * 100));
  customInput.value = String(settings.customSeconds);
  syncDurationUi();
}

function syncDurationUi() {
  durationPresets.querySelectorAll('.chip').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === settings.durationId);
    btn.setAttribute('aria-pressed', btn.dataset.id === settings.durationId ? 'true' : 'false');
  });
  const custom = settings.durationId === 'custom';
  customWrap.hidden = !custom;
}

shuffleEl.addEventListener('change', () => {
  settings.shuffle = shuffleEl.checked;
  persist();
  bumpIdle();
});
soundEl.addEventListener('change', () => {
  settings.muted = !soundEl.checked;
  audio.muted = settings.muted;
  persist();
  bumpIdle();
});
volumeEl.addEventListener('input', () => {
  settings.volume = Number(volumeEl.value) / 100;
  audio.volume = settings.volume;
  if (settings.volume > 0 && settings.muted) {
    settings.muted = false;
    soundEl.checked = true;
    audio.muted = false;
  }
  persist();
  bumpIdle();
});
customInput.addEventListener('input', () => {
  settings.customSeconds = Math.max(5, Math.min(7200, Number(customInput.value) || 5));
  persist();
  bumpIdle();
});

btnPrev.addEventListener('click', () => { nextScene(-1); bumpIdle(); });
btnNext.addEventListener('click', () => { nextScene(1); bumpIdle(); });
btnFs.addEventListener('click', () => { toggleFullscreen(); bumpIdle(); });
btnClose.addEventListener('click', () => hideSettings());

engine.onFrame = () => {
  if (!playing) return;
  const dur = durationMs(settings);
  const elapsed = performance.now() - startedAt;
  const pct = Math.max(0, Math.min(100, (elapsed / dur) * 100));
  progressEl.style.width = pct + '%';
  if (elapsed >= dur) nextScene(1);
};

async function startApp() {
  playing = true;
  startScreen.classList.add('hidden');
  const first = (qs.scene && getScene(qs.scene).id === qs.scene)
    ? qs.scene
    : (enabledList()[0]?.id || SCENES[0].id);
  loadScene(first, { announce: false });
  engine.start();
  bumpIdle();
  if (qs.hideui) {
    hideSettings();
    document.body.classList.remove('cursor-on');
  }
  // Unlock audio and chrome features without blocking the first frame.
  audio.unlock();
  if (!qs.nofullscreen) enterFullscreen();
  requestWakeLock();
}

startBtn.addEventListener('click', startApp);

document.addEventListener('pointermove', () => {
  if (!playing) return;
  document.body.classList.add('cursor-on');
  if (!qs.hideui) showSettings();
  else bumpIdle();
});

document.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  if (settingsEl.contains(e.target)) {
    bumpIdle();
    return;
  }
  if (settingsOpen()) hideSettings();
  else showSettings();
});

document.addEventListener('keydown', (e) => {
  if (!playing) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startApp();
    }
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    nextScene(1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    nextScene(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (settingsOpen()) hideSettings();
    else showSettings();
  } else if (e.key === 'Escape') {
    if (settingsOpen()) hideSettings();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  } else if (e.key === 'm' || e.key === 'M') {
    settings.muted = !settings.muted;
    audio.muted = settings.muted;
    soundEl.checked = !settings.muted;
    persist();
  }
  bumpIdle();
});

document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    engine.stop();
  } else {
    if (playing) {
      engine.start();
      startedAt = performance.now() - (Number.parseFloat(progressEl.style.width) / 100) * durationMs(settings) || startedAt;
      await requestWakeLock();
      await audio.unlock();
    }
  }
});

buildUi();

// Preview aquarium behind the start screen
if (!qs.autostart) {
  audio.muted = true;
  loadScene('aquarium', { announce: false });
  engine.start();
  audio.muted = settings.muted;
}

if (qs.autostart) {
  startApp();
}

// Expose a tiny test hook for screenshots
window.CatTV = {
  start: startApp,
  play: (id) => loadScene(id, { announce: false }),
  scenes: SCENES.map((s) => s.id),
};
