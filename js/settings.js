import { SCENES } from './scenes/registry.js';

const KEY = 'cat-tv-settings-v1';

export const DURATION_PRESETS = [
  { id: '30s', label: '30s', ms: 30_000 },
  { id: '1m', label: '1 min', ms: 60_000 },
  { id: '2m', label: '2 min', ms: 120_000 },
  { id: '5m', label: '5 min', ms: 300_000 },
  { id: '10m', label: '10 min', ms: 600_000 },
  { id: '30m', label: '30 min', ms: 1_800_000 },
  { id: 'custom', label: 'Custom', ms: null },
];

export function defaultSettings() {
  return {
    enabled: SCENES.map((s) => s.id),
    durationId: '2m',
    customSeconds: 180,
    shuffle: false,
    muted: false,
    volume: 0.35,
  };
}

export function loadSettings() {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    const known = new Set(SCENES.map((s) => s.id));
    const enabled = Array.isArray(data.enabled)
      ? [...new Set(data.enabled.filter((id) => known.has(id)))]
      : base.enabled;
    return {
      ...base,
      durationId: DURATION_PRESETS.some((p) => p.id === data.durationId) ? data.durationId : base.durationId,
      shuffle: data.shuffle === true,
      muted: data.muted === true,
      enabled: enabled.length ? enabled : base.enabled,
      customSeconds: Math.max(5, Math.min(7200, Math.round(Number(data.customSeconds)) || base.customSeconds)),
      volume: Number.isFinite(data.volume) ? Math.max(0, Math.min(1, data.volume)) : base.volume,
    };
  } catch {
    return base;
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      enabled: s.enabled,
      durationId: s.durationId,
      customSeconds: s.customSeconds,
      shuffle: !!s.shuffle,
      muted: !!s.muted,
      volume: s.volume,
    }));
  } catch {}
}

export function durationMs(s) {
  if (s.durationId === 'custom') return Math.max(5, s.customSeconds) * 1000;
  return (DURATION_PRESETS.find((p) => p.id === s.durationId) || DURATION_PRESETS[2]).ms;
}
