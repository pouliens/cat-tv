export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const choice = (arr) => arr[(Math.random() * arr.length) | 0];
export const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
export const TAU = Math.PI * 2;

export function wrap(v, max) {
  if (v < 0) return v + max;
  if (v >= max) return v - max;
  return v;
}

export function hashHue(n) {
  return ((n * 47) % 360 + 360) % 360;
}

export function nearestTo(items, x, y) {
  let nearest;
  let best = Infinity;
  for (const item of items) {
    const distance = (item.x - x) ** 2 + (item.y - y) ** 2;
    if (distance < best) {
      nearest = item;
      best = distance;
    }
  }
  return nearest;
}
