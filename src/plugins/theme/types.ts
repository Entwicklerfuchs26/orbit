export type Density = 'compact' | 'comfortable';
export type Animations = 'on' | 'reduced' | 'off';
export type SetMode = 'light' | 'dark' | 'auto';

export interface ThemeSet {
  id: string;
  name: string;
  /** Seed colour (hex) — the whole palette is derived from this. */
  accent: string;
  mode: SetMode;
  font: string;
  /** Base corner radius in px. */
  radius: number;
  density: Density;
  animations: Animations;
  /** Optional wallpapers as data URLs or http(s) URLs. */
  wallpaperDesktop?: string;
  wallpaperMobile?: string;
  /** Dim the wallpaper behind content, 0..1. */
  wallpaperDim: number;
  /** Built-in presets can't be deleted, only duplicated. */
  builtin?: boolean;
}

export interface ThemeState {
  sets: ThemeSet[];
  activeSetId: string | null;
}

export const FONTS: { label: string; value: string }[] = [
  { label: 'System', value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Inter / Sans', value: "'Inter', system-ui, sans-serif" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Mono', value: "ui-monospace, 'Cascadia Code', Menlo, monospace" },
  { label: 'Rund (Comic-frei)', value: "'Nunito', 'Quicksand', system-ui, sans-serif" },
];
