/** Classify a hex colour into one of the COLOR_FAMILIES keys. */
export function colorFamily(hex?: string): string {
  if (!hex) return 'mono';
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'mono';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const { h, s } = rgbToHsl(r, g, b);
  if (s < 0.15) return 'mono';
  if (h < 15 || h >= 345) return 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 160) return 'green';
  if (h < 195) return 'teal';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

/** Perceived lightness 0..1, for colour-based sorting. */
export function lightness(hex?: string): number {
  if (!hex) return 0;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Sort key for the "Regenbogen" (rainbow) order: saturated colours by hue with
 * red at the top (~0°), near-360° reds grouped with them; greys/no-accent sort
 * to the end, ordered by lightness.
 */
export function rainbowKey(hex?: string): number {
  if (!hex) return 2000;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 2000;
  const n = parseInt(m[1], 16);
  const { h, s, l } = rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  if (s < 0.15) return 1000 + l; // greys after all colours
  return h >= 345 ? h - 360 : h; // wrap high-red near 0 so reds group at the top
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}
