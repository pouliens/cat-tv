import { buildGuide, featureScene } from './guide.js';
import { Engine } from './engine.js';
import { AudioEngine } from './audio.js';
import { SCENES, createScene, getScene } from './scenes/registry.js';
import { DURATION_PRESETS, loadSettings, saveSettings, durationMs } from './settings.js';

const params = new URLSearchParams(location.search);
const qs = {
  guide: params.get('guide') === '1' || params.get('autostart') === '0',
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
const audioPrompt = document.getElementById('enable-audio');
const audio = new AudioEngine(syncAudioState);
const settings = loadSettings();
if (qs.muted) settings.muted = true;

let playing = false;
let currentId = settings.enabled[0] || SCENES[0].id;
let startedAt = 0;
let hideTimer = 0;
let hiddenAt = null;
let guideBuilt = false;
let returnFocus;
let wakeLock = null;
let toastTimer = 0;
let stayOpen = !!qs.showui;

audio.muted = settings.muted;
audio.volume = settings.volume;

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
  audio.setScene(def.id);
  engine.setScene(createScene(def.id, { audio }));
  if (playing) audio.cue();
  nowPlaying.textContent = def.name;
  startedAt = performance.now();
  if (announce && playing) showToast(def.name);
}

function nextScene(dir = 1) {
  const list = enabledList();
  if (list.length === 1 && list[0].id === currentId) {
    startedAt = performance.now();
    return;
  }
  if (list.length === 1) {
    loadScene(list[0].id);
    return;
  }
  let id;
  if (settings.shuffle && dir > 0) {
    const others = list.filter((s) => s.id !== currentId);
    id = others[Math.floor(Math.random() * others.length)].id;
  } else {
    const i = SCENES.findIndex((s) => s.id === currentId);
    for (let offset = 1; offset <= SCENES.length; offset++) {
      const candidate = SCENES[(i + dir * offset + SCENES.length) % SCENES.length];
      if (settings.enabled.includes(candidate.id)) {
        id = candidate.id;
        break;
      }
    }
  }
  loadScene(id);
}

async function requestWakeLock() {
  try {
    if (!playing || document.hidden || wakeLock || !navigator.wakeLock?.request) return;
    const lock = await navigator.wakeLock.request('screen');
    if (!playing || document.hidden || wakeLock) {
      await lock.release();
      return;
    }
    wakeLock = lock;
    lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  } catch { /* Wake lock is optional. */ }
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
  btnFs.hidden = qs.nofullscreen || !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const on = isFullscreen();
  btnFs.classList.toggle('is-active', on);
  btnFs.setAttribute('aria-pressed', on ? 'true' : 'false');
  btnFs.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
  btnFs.dataset.tip = on ? 'Exit full screen' : 'Fullscreen';
}

function needsAudioGesture() {
  return playing && audio.supported && !settings.muted && !audio.ready;
}

let soundWasReady = false;
function syncAudioState() {
  if (playing && !document.hidden && audio.ready && !soundWasReady) audio.cue();
  soundWasReady = audio.ready;
  syncMuteUi();
}

function syncAudioPrompt() {
  audioPrompt.hidden = !needsAudioGesture() || qs.hideui || !chromeVisible() || settingsOpen();
}

function enableAudio() {
  audio.muted = false;
  audio.unlock();
  if (document.activeElement === audioPrompt) canvas.focus();
}

function syncMuteUi() {
  const muted = settings.muted;
  const blocked = needsAudioGesture();
  soundEl.disabled = !audio.supported;
  soundEl.checked = audio.supported && !muted && !blocked;
  btnMute.hidden = !audio.supported;
  syncAudioPrompt();
  const guideSound = document.getElementById('guide-sound');
  const icon = btnMute.querySelector(muted ? '.ico-off' : '.ico-on').cloneNode(true);
  guideSound.hidden = !audio.supported;
  guideSound.textContent = '';
  guideSound.append(icon, muted ? 'Sound off' : 'Sound on');
  guideSound.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  btnMute.classList.toggle('is-active', muted || blocked);
  btnMute.setAttribute('aria-pressed', muted ? 'true' : 'false');
  btnMute.setAttribute('aria-label', blocked ? 'Enable sound' : muted ? 'Unmute sound' : 'Mute sound');
  btnMute.dataset.tip = blocked ? 'Enable sound' : muted ? 'Unmute' : 'Mute';
}

function setMuted(muted) {
  settings.muted = !!muted;
  audio.muted = settings.muted;
  if (playing && !muted) audio.unlock();
  syncMuteUi();
  persist();
}

function openSettings() {
  settingsEl.inert = false;
  settingsEl.classList.remove('is-hidden');
  settingsEl.setAttribute('aria-hidden', 'false');
  btnSettings.setAttribute('aria-expanded', 'true');
  syncAudioPrompt();
  btnClose.focus({ preventScroll: true });
}

function closeSettings() {
  if (settingsEl.contains(document.activeElement)) btnSettings.focus();
  settingsEl.inert = true;
  settingsEl.classList.add('is-hidden');
  settingsEl.setAttribute('aria-hidden', 'true');
  btnSettings.setAttribute('aria-expanded', 'false');
  syncAudioPrompt();
}

function showChrome({ panel = false } = {}) {
  if (qs.hideui) return;
  chromeEl.inert = false;
  chromeEl.classList.remove('is-hidden');
  document.body.classList.add('cursor-on');
  syncAudioPrompt();
  if (panel) openSettings();
  bumpIdle();
}

function hideChrome() {
  if (stayOpen) return;
  closeSettings();
  if (chromeEl.contains(document.activeElement)) canvas.focus({ preventScroll: true });
  chromeEl.inert = true;
  chromeEl.classList.add('is-hidden');
  document.body.classList.remove('cursor-on');
  syncAudioPrompt();
}

function bumpIdle() {
  clearTimeout(hideTimer);
  if (!playing || stayOpen || qs.hideui || settingsOpen()) return;
  hideTimer = setTimeout(() => {
    if (!chromeEl.querySelector(':focus-visible')) hideChrome();
  }, 5000);
}

function buildUi() {
  sceneToggles.innerHTML = '';
  for (const s of SCENES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scene-card';
    btn.title = s.blurb;
    btn.setAttribute('aria-label', s.name);
    btn.textContent = s.name;
    btn.dataset.id = s.id;
    btn.addEventListener('click', () => {
      const on = settings.enabled.includes(s.id);
      if (on) {
        if (settings.enabled.length === 1) return;
        settings.enabled = settings.enabled.filter((id) => id !== s.id);
      } else {
        settings.enabled = [...settings.enabled, s.id];
      }
      syncPlaylistUi();
      persist();
      if (!settings.enabled.includes(currentId)) nextScene(1);
      bumpIdle();
    });
    sceneToggles.appendChild(btn);
  }

  syncPlaylistUi();
  for (const preset of DURATION_PRESETS) {
    durationPresets.add(new Option(preset.label, preset.id));
  }

  shuffleEl.checked = settings.shuffle;
  volumeEl.value = String(Math.round(settings.volume * 100));
  customInput.value = String(settings.customSeconds);
  syncDurationUi();
  syncMuteUi();
  syncFsUi();
}

function syncPlaylistUi() {
  const count = settings.enabled.length;
  document.getElementById('playlist-count').textContent = count + ' selected';
  for (const button of sceneToggles.children) {
    const selected = settings.enabled.includes(button.dataset.id);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-disabled', String(selected && count === 1));
    button.title = selected && count === 1 ? 'Keep at least one scene in your playlist' : getScene(button.dataset.id).blurb;
  }
}

function syncDurationUi() {
  durationPresets.value = settings.durationId;
  customWrap.hidden = settings.durationId !== 'custom';
}

durationPresets.addEventListener('change', () => {
  settings.durationId = durationPresets.value;
  persist();
  syncDurationUi();
  startedAt = performance.now();
});

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
function commitCustomDuration() {
  const seconds = customInput.valueAsNumber;
  if (Number.isFinite(seconds)) settings.customSeconds = Math.max(5, Math.min(7200, Math.round(seconds)));
  customInput.value = String(settings.customSeconds);
  startedAt = performance.now();
  persist();
  bumpIdle();
}
customInput.addEventListener('blur', commitCustomDuration);
customInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') customInput.blur();
});

btnPrev.addEventListener('click', () => { nextScene(-1); bumpIdle(); });
btnNext.addEventListener('click', () => { nextScene(1); bumpIdle(); });
function toggleSound() {
  if (needsAudioGesture()) enableAudio();
  else setMuted(!settings.muted);
  bumpIdle();
}
btnMute.addEventListener('click', toggleSound);
audioPrompt.addEventListener('click', enableAudio);
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
  if (chromeVisible()) progressEl.style.transform = 'scaleX(' + pct / 100 + ')';
  if (elapsed >= dur) nextScene(1);
};

function firstScene() {
  return SCENES.find((scene) => scene.id === qs.scene)?.id || enabledList()[0].id;
}

function startApp(id = firstScene(), fromGesture = true) {
  if (playing) return;
  returnFocus = document.activeElement;
  playing = true;
  hiddenAt = null;
  startScreen.hidden = true;
  canvas.hidden = false;
  canvas.focus({ preventScroll: true });
  audio.muted = settings.muted;
  loadScene(id, { announce: false });
  audio.unlock();
  engine.start();
  if (!qs.hideui) showChrome({ panel: stayOpen });
  else document.body.classList.remove('cursor-on');
  if (fromGesture && !qs.nofullscreen) enterFullscreen();
  requestWakeLock();
}

function showGuide() {
  if (playing) {
    playing = false;
    engine.stop();
    audio.muted = true;
    audio.setScene(null);
    syncAudioState();
    const lock = wakeLock;
    wakeLock = null;
    lock?.release().catch(() => {});
    if (isFullscreen()) toggleFullscreen();
  }
  clearTimeout(hideTimer);
  clearTimeout(toastTimer);
  toast.hidden = true;
  closeSettings();
  chromeEl.inert = true;
  chromeEl.classList.add('is-hidden');
  canvas.hidden = true;
  startScreen.hidden = false;
  if (!guideBuilt) {
    buildGuide(startApp);
    guideBuilt = true;
  }
  featureScene(firstScene());
  if (returnFocus && startScreen.contains(returnFocus)) returnFocus.focus();
  else if (returnFocus) startBtn.focus({ preventScroll: true });
}

startBtn.addEventListener('click', () => startApp());
document.getElementById('btn-guide').addEventListener('click', showGuide);
document.getElementById('guide-sound').addEventListener('click', () => setMuted(!settings.muted));

document.addEventListener('pointermove', (event) => {
  if (playing && event.pointerType !== 'touch') showChrome();
});

document.addEventListener('pointerdown', (e) => {
  if (!playing || qs.hideui) return;
  if (audioPrompt.contains(e.target)) return;
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

// Move focus across the visible grid for remotes that only send directional keys.
function moveFocus(container, key) {
  const focused = document.activeElement;
  const origin = (focused.closest('label') || focused).getBoundingClientRect();
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  let best = null;
  let lowest = Infinity;
  for (const element of container.querySelectorAll('button, input, select')) {
    if (element === focused || !element.getClientRects().length || element.closest('[inert]')) continue;
    const box = (element.closest('label') || element).getBoundingClientRect();
    const x = box.left + box.width / 2 - origin.left - origin.width / 2;
    const y = box.top + box.height / 2 - origin.top - origin.height / 2;
    const forward = direction * (horizontal ? x : y);
    const across = Math.abs(horizontal ? y : x);
    if (forward <= 1 || across > forward) continue;
    const score = forward + 3 * across;
    if (score < lowest) { best = element; lowest = score; }
  }
  best?.focus();
}

document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
  const field = e.target.matches('input, select');
  const arrow = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key);
  if (!playing) {
    if (!startScreen.contains(e.target) && (arrow || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (arrow) startBtn.focus();
      else startApp();
    } else if (arrow) {
      e.preventDefault();
      moveFocus(startScreen, e.key);
    }
    return;
  }
  const back = e.key === 'Escape' || e.key === 'BrowserBack' || e.keyCode === 10009 || e.keyCode === 461;
  if (back) {
    e.preventDefault();
    if (settingsOpen()) closeSettings();
    else if (chromeVisible()) hideChrome();
    else showGuide();
  } else if (e.key === 'Tab' && !qs.hideui) {
    showChrome();
  } else if (arrow && !(field && (
    (e.target.type === 'range' && ['ArrowLeft', 'ArrowRight'].includes(e.key)) ||
    (['number', 'select-one'].includes(e.target.type) && ['ArrowUp', 'ArrowDown'].includes(e.key))
  ))) {
    e.preventDefault();
    if (chromeEl.contains(e.target)) moveFocus(chromeEl, e.key);
    else nextScene(e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
  } else if (e.key === 'Enter' && field && e.target.type === 'checkbox') {
    e.preventDefault();
    e.target.click();
  } else if (e.key === 'Enter' && !e.target.closest('button, input, select')) {
    e.preventDefault();
    if (needsAudioGesture()) {
      enableAudio();
      if (!qs.nofullscreen) enterFullscreen();
    } else if (!qs.hideui) {
      showChrome();
      document.getElementById('btn-guide').focus();
    }
  } else if (!field && e.key.toLowerCase() === 'f') {
    toggleFullscreen();
  } else if (!field && e.key.toLowerCase() === 'm') {
    toggleSound();
  }
  bumpIdle();
});

document.addEventListener('visibilitychange', () => {
  if (!playing) return;
  if (document.hidden) {
    hiddenAt = performance.now();
    audio.muted = true;
    engine.stop();
  } else {
    if (hiddenAt !== null) startedAt += performance.now() - hiddenAt;
    hiddenAt = null;
    audio.muted = settings.muted;
    engine.start();
    requestWakeLock();
    audio.unlock();
  }
});

buildUi();
if (qs.guide) {
  showGuide();
} else {
  const playlist = enabledList();
  const random = playlist[Math.floor(Math.random() * playlist.length)];
  startApp(SCENES.find((scene) => scene.id === qs.scene)?.id || random.id, false);
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
