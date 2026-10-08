import type { ThemeSet } from './types';

const base = {
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  radius: 10,
  density: 'comfortable' as const,
  animations: 'on' as const,
  wallpaperDim: 0.35,
  builtin: true,
};

export const PRESETS: ThemeSet[] = [
  { ...base, id: 'sternenhof', name: 'Sternenhof', accent: '#ff6b35', mode: 'dark' },
  { ...base, id: 'aurora', name: 'Aurora', accent: '#5b8def', mode: 'dark' },
  { ...base, id: 'nord', name: 'Nord', accent: '#88c0d0', mode: 'dark' },
  { ...base, id: 'forest', name: 'Wald', accent: '#4caf72', mode: 'dark' },
  { ...base, id: 'grape', name: 'Traube', accent: '#9b6bff', mode: 'dark' },
  { ...base, id: 'rose', name: 'Rosé', accent: '#ef5da8', mode: 'light' },
  { ...base, id: 'sand', name: 'Sand', accent: '#c79a5b', mode: 'light' },
];

export function clonePresets(): ThemeSet[] {
  return PRESETS.map((p) => ({ ...p }));
}
