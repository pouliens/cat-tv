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
  showui: params.get('showui') === '1',
};

const canvas = document.getElementById('stage');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const chromeEl = document.getElementById('chrome');
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
const btnMute = document.getElementById('btn-mute');
const btnFs = document.getElementById('btn-fullscreen');
const btnSettings = document.getElementById('btn-settings');
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
let stayOpen = !!qs.showui;

audio.muted = settings.muted;
audio.volume = settings.volume;

const ICON = {
  stroke: 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"',
};

const SCENE_ICONS = {
  aquarium: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M4 12c3-5 7-6 10-5 4 1 6 4 6 5s-2 4-6 5c-3 1-7 0-10-5z"/><path ${ICON.stroke} d="M4 12l-2-3M4 12l-2 3"/><circle cx="15.2" cy="11" r="1" fill="currentColor"/></svg>`,
  logo: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="7" width="15" height="10" rx="2.5" ${ICON.stroke}/><path ${ICON.stroke} d="M8 12h8"/></svg>`,
  intro: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M6 18V6l6 8 6-8v12"/></svg>`,
  birds: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M4 14c3-1 5-4 6.5-4.5C9 8 8 5.5 10 5c2 2 3.5 4 7 5 2 .5 3.5 2 3.5 3.5-3 0-5.5-1-8-1-2 3-5 4.5-8.5 1.5z"/></svg>`,
  laser: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" ${ICON.stroke}/><path ${ICON.stroke} d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20M6.4 6.4l1.8 1.8M15.8 15.8l1.8 1.8M17.6 6.4l-1.8 1.8M8.2 15.8l-1.8 1.8"/></svg>`,
  mice: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M4 15.5c0-3.5 2.8-6 6.2-6 4 0 6.3 2.4 8.8 1.2-1 3-3 5.3-8 5.3S4 18 4 15.5z"/><circle cx="9.2" cy="13.4" r="0.9" fill="currentColor"/><path ${ICON.stroke} d="M6.2 10.2c-.2-1.6 1-2.8 2.2-2.4"/></svg>`,
  butterflies: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M12 6v12"/><path ${ICON.stroke} d="M12 11C8 5 4.5 6.5 5 10.5S10 14 12 12c2 2 6.5 1.5 7-1.5S16 5 12 11z"/><path ${ICON.stroke} d="M12 13c-3 4-6 3.2-5.7 7 3 .3 5.2-2 5.7-4.5 0.5 2.5 2.7 4.8 5.7 4.5.3-3.8-2.7-3-5.7-7z"/></svg>`,
  wand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M14.5 4.5 8 20"/><path ${ICON.stroke} d="M15 5.5c1.8-2.6 5-2.2 5.2.4-1.6.4-3 .2-5.2-.4z"/><path ${ICON.stroke} d="M16.5 4.2l.6-1.6M18.6 6.2l1.5-.3"/></svg>`,
  yarn: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="12" r="6.5" ${ICON.stroke}/><path ${ICON.stroke} d="M6.2 9.5c3 1 6.2 1 9.4-.2M6.4 14c3 .9 6.4.8 9.2-.4M9 6.4c1.4 3.2 1.6 6.6.3 10.2M13.4 6.2c1 3.4 1 7.2-.2 10.8M17.2 15.5 20 20"/></svg>`,
  fireflies: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${ICON.stroke} d="M12 7.5v2M12 14.5v2M8.5 12h-2M17.5 12h-2M9.2 9.2l-1.4-1.4M16.2 16.2l-1.4-1.4M16.2 7.8l-1.4 1.4M9.2 14.8l-1.4 1.4"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>`,
};

function persist() { saveSettings(settings); }

function enabledList() {
  const set = new Set(settings.enabled);
  const list = SCENES.filter((s) => set.has(s.id));
  return list.length ? list : [...SCENES];
}

function chromeVisible() {
  return !chromeEl.classList.contains('is-hidden');
}

function settingsOpen() {
  return !settingsEl.classList.contains('is-hidden');
}

function showToast(name) {
  if (qs.hideui) return;
  if (chromeVisible()) return;
  toast.hidden = false;
  toast.textContent = name;
  toast.classList.add('is-on', 'show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on', 'show'), 2000);
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

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function syncFsUi() {
  const on = isFullscreen();
  btnFs.classList.toggle('is-active', on);
  btnFs.setAttribute('aria-pressed', on ? 'true' : 'false');
  btnFs.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
  btnFs.dataset.tip = on ? 'Exit full screen' : 'Fullscreen';
}

function syncMuteUi() {
  const muted = settings.muted;
  soundEl.checked = !muted;
  btnMute.classList.toggle('is-active', muted);
  btnMute.setAttribute('aria-pressed', muted ? 'true' : 'false');
  btnMute.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  btnMute.dataset.tip = muted ? 'Unmute' : 'Mute';
}

function setMuted(muted) {
  settings.muted = !!muted;
  audio.muted = settings.muted;
  syncMuteUi();
  persist();
}

function openSettings() {
  settingsEl.classList.remove('is-hidden', 'hidden');
  settingsEl.setAttribute('aria-hidden', 'false');
  btnSettings.setAttribute('aria-expanded', 'true');
}

function closeSettings() {
  settingsEl.classList.add('is-hidden');
  settingsEl.setAttribute('aria-hidden', 'true');
  btnSettings.setAttribute('aria-expanded', 'false');
}

function showChrome({ panel = false } = {}) {
  if (qs.hideui) return;
  chromeEl.classList.remove('is-hidden');
  document.body.classList.add('cursor-on');
  if (panel) openSettings();
  bumpIdle();
}

function hideChrome() {
  if (stayOpen) return;
  closeSettings();
  chromeEl.classList.add('is-hidden');
  document.body.classList.remove('cursor-on');
}

function bumpIdle() {
  clearTimeout(hideTimer);
  clearTimeout(cursorTimer);
  document.body.classList.add('cursor-on');
  if (!playing || stayOpen || qs.hideui) return;
  const active = document.activeElement;
  const hold = active && settingsEl.contains(active) && active.tagName === 'INPUT' && active.type === 'number';
  hideTimer = setTimeout(() => {
    if (!hold) hideChrome();
  }, 5000);
  cursorTimer = setTimeout(() => {
    if (!chromeVisible()) document.body.classList.remove('cursor-on');
  }, 3000);
}

function buildUi() {
  sceneToggles.innerHTML = '';
  for (const s of SCENES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scene-card';
    btn.title = s.blurb;
    btn.setAttribute('aria-pressed', settings.enabled.includes(s.id) ? 'true' : 'false');
    btn.innerHTML = `<span class="scene-icon">${SCENE_ICONS[s.id] || ''}</span><span class="scene-name">${s.name}</span>`;
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
    btn.className = 'seg';
    btn.dataset.id = p.id;
    btn.textContent = p.label;
    btn.setAttribute('role', 'radio');
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
  volumeEl.value = String(Math.round(settings.volume * 100));
  customInput.value = String(settings.customSeconds);
  syncDurationUi();
  syncMuteUi();
  syncFsUi();
}

function syncDurationUi() {
  durationPresets.querySelectorAll('.seg').forEach((btn) => {
    const on = btn.dataset.id === settings.durationId;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  customWrap.hidden = settings.durationId !== 'custom';
}

shuffleEl.addEventListener('change', () => {
  settings.shuffle = shuffleEl.checked;
  persist();
  bumpIdle();
});
soundEl.addEventListener('change', () => {
  setMuted(!soundEl.checked);
  bumpIdle();
});
volumeEl.addEventListener('input', () => {
  settings.volume = Number(volumeEl.value) / 100;
  audio.volume = settings.volume;
  if (settings.volume > 0 && settings.muted) setMuted(false);
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
btnMute.addEventListener('click', () => { setMuted(!settings.muted); bumpIdle(); });
btnFs.addEventListener('click', () => { toggleFullscreen(); bumpIdle(); });
btnSettings.addEventListener('click', () => {
  if (settingsOpen()) closeSettings();
  else openSettings();
  bumpIdle();
});
btnClose.addEventListener('click', () => {
  closeSettings();
  bumpIdle();
});

document.addEventListener('fullscreenchange', syncFsUi);
document.addEventListener('webkitfullscreenchange', syncFsUi);

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
  startScreen.classList.add('is-hidden', 'hidden');
  const first = (qs.scene && getScene(qs.scene).id === qs.scene)
    ? qs.scene
    : (enabledList()[0]?.id || SCENES[0].id);
  loadScene(first, { announce: false });
  engine.start();
  if (qs.hideui) {
    hideChrome();
    document.body.classList.remove('cursor-on');
  } else if (stayOpen) {
    showChrome({ panel: true });
  } else {
    bumpIdle();
  }
  audio.unlock();
  if (!qs.nofullscreen) enterFullscreen();
  requestWakeLock();
}

startBtn.addEventListener('click', startApp);

document.addEventListener('pointermove', () => {
  if (!playing) return;
  document.body.classList.add('cursor-on');
  if (!qs.hideui) showChrome({ panel: false });
  else bumpIdle();
});

document.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  if (chromeEl.contains(e.target)) {
    bumpIdle();
    return;
  }
  if (settingsOpen()) {
    closeSettings();
    bumpIdle();
  } else if (chromeVisible()) {
    hideChrome();
  } else {
    showChrome({ panel: false });
  }
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
    if (!chromeVisible()) showChrome({ panel: true });
    else if (settingsOpen()) closeSettings();
    else openSettings();
  } else if (e.key === 'Escape') {
    if (settingsOpen()) closeSettings();
    else hideChrome();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  } else if (e.key === 'm' || e.key === 'M') {
    setMuted(!settings.muted);
  }
  bumpIdle();
});

document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    engine.stop();
  } else if (playing) {
    engine.start();
    startedAt = performance.now() - (Number.parseFloat(progressEl.style.width) / 100) * durationMs(settings) || startedAt;
    await requestWakeLock();
    await audio.unlock();
  }
});

buildUi();

if (!qs.autostart) {
  audio.muted = true;
  loadScene('aquarium', { announce: false });
  engine.start();
  audio.muted = settings.muted;
}

if (qs.autostart) {
  startApp();
}

window.CatTV = {
  start: startApp,
  play: (id) => loadScene(id, { announce: false }),
  scenes: SCENES.map((s) => s.id),
  showUi(panel = true, stay = true) {
    stayOpen = stay;
    showChrome({ panel });
  },
  hideUi() {
    stayOpen = false;
    hideChrome();
  },
};
