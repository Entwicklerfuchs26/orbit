import type { SchemeCharacter, Finish } from '../theme/palette';

export type ViewMode = 'slices' | 'depth' | 'geometric' | 'wall' | 'sandy' | 'hand' | 'collection';
export type MenuSide = 'left' | 'right';
export type MenuMode = 'pinned' | 'auto';
export type PaletteBehaviour = 'follow' | 'fixed' | 'keep';
export type FillMode = 'cover' | 'contain' | 'stretch' | 'center' | 'tile';
export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'wipe'
  | 'crosswarp'
  | 'morph'
  | 'pixelize'
  | 'dreamy'
  | 'windowslice'
  | 'directionalwarp'
  | 'ripple'
  | 'swirl'
  | 'crosshatch'
  | 'wind'
  | 'iris'
  | 'polka';

export const TRANSITIONS: { value: TransitionType; label: string; gpu?: boolean }[] = [
  { value: 'none', label: 'Keiner' },
  { value: 'fade', label: 'Überblenden' },
  { value: 'slide', label: 'Schieben' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipe', label: 'Wischen' },
  { value: 'crosswarp', label: 'Warp', gpu: true },
  { value: 'directionalwarp', label: 'Warp ↗', gpu: true },
  { value: 'morph', label: 'Morph', gpu: true },
  { value: 'pixelize', label: 'Pixel', gpu: true },
  { value: 'dreamy', label: 'Traum', gpu: true },
  { value: 'windowslice', label: 'Streifen', gpu: true },
  { value: 'ripple', label: 'Welle', gpu: true },
  { value: 'swirl', label: 'Wirbel', gpu: true },
  { value: 'crosshatch', label: 'Schraffur', gpu: true },
  { value: 'wind', label: 'Wind', gpu: true },
  { value: 'iris', label: 'Iris', gpu: true },
  { value: 'polka', label: 'Punkte', gpu: true },
];

export const FILL_MODES: { value: FillMode; label: string }[] = [
  { value: 'cover', label: 'Füllen' },
  { value: 'contain', label: 'Einpassen' },
  { value: 'stretch', label: 'Strecken' },
  { value: 'center', label: 'Zentriert' },
  { value: 'tile', label: 'Kacheln' },
];

export interface WallpaperItem {
  id: string;
  name: string;
  /** Media kind; defaults to 'image' for older items without the field. */
  kind?: 'image' | 'video';
  /** Seed colour extracted on import. */
  accent?: string;
  favorite?: boolean;
  /** Free-form tags for filtering. */
  tags?: string[];
}

export type MediaTab = 'all' | 'image' | 'video' | 'we';

export const MEDIA_TABS: { value: MediaTab; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'image', label: 'Bilder' },
  { value: 'video', label: 'Videos' },
  { value: 'we', label: 'Wallpaper Engine' },
];

/** A named group / playlist of wallpapers. */
export interface Collection {
  id: string;
  name: string;
  itemIds: string[];
}

/** A saved theming preset (seed + character + finish + behaviour + contrast). */
export interface ThemePreset {
  id: string;
  name: string;
  schemeCharacter: SchemeCharacter;
  finish: Finish;
  paletteBehaviour: PaletteBehaviour;
  fixedSeed: string;
  contrast: number;
}

/** A deleted wallpaper kept in the trash for possible recovery. */
export interface TrashItem {
  id: string;
  name: string;
  kind?: 'image' | 'video';
  accent?: string;
  tags?: string[];
  /** epoch ms when it was moved to trash. */
  deletedAt: number;
}

/** A saved geometry snapshot (SELECTOR custom presets C1–C4). */
export interface GeometryPreset {
  viewMode: ViewMode;
  wallColumns: number;
  slicesSkew: number;
  slicesHeight: number;
  hexSize: number;
  hexRows: number;
  hexColumns: number;
  hexScrollStep: number;
  hexArc: boolean;
  hexArcIntensity: number;
  depthTilt: number;
  handSpread: number;
}

/** Named palettes for auto-recolour (SKWD "Recolour theme"). */
export const RECOLOUR_PALETTES: { value: string; label: string; colors: string[] }[] = [
  { value: 'theme', label: 'App-Theme', colors: [] }, // uses the live theme palette
  {
    value: 'catppuccin',
    label: 'Catppuccin',
    colors: ['#1e1e2e', '#313244', '#45475a', '#cdd6f4', '#f5c2e7', '#cba6f7', '#89b4fa', '#94e2d5', '#a6e3a1', '#f9e2af', '#fab387', '#f38ba8'],
  },
  {
    value: 'gruvbox',
    label: 'Gruvbox',
    colors: ['#282828', '#3c3836', '#504945', '#ebdbb2', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019', '#d65d0e'],
  },
  {
    value: 'nord',
    label: 'Nord',
    colors: ['#2e3440', '#3b4252', '#434c5e', '#eceff4', '#88c0d0', '#81a1c1', '#5e81ac', '#8fbcbb', '#a3be8c', '#ebcb8b', '#d08770', '#bf616a'],
  },
];

/** A time-of-day rule: at `time`, switch to the given target. */
export interface ScheduleRule {
  id: string;
  /** "HH:MM" 24h local time. */
  time: string;
  targetType: 'item' | 'collection' | 'random';
  /** item id or collection id; unused for 'random'. */
  targetId?: string;
}

export type SortBy =
  | 'newest'
  | 'oldest'
  | 'name'
  | 'nameDesc'
  | 'rainbow'
  | 'color'
  | 'colorDark'
  | 'favorites'
  | 'shuffle';

export const SORTS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Älteste' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'nameDesc', label: 'Name Z–A' },
  { value: 'rainbow', label: 'Regenbogen' },
  { value: 'color', label: 'Farbe hell→dunkel' },
  { value: 'colorDark', label: 'Farbe dunkel→hell' },
  { value: 'favorites', label: 'Favoriten zuerst' },
  { value: 'shuffle', label: 'Zufällig' },
];

/** Named colour families for the swatch filter (hue buckets). */
export const COLOR_FAMILIES: { key: string; label: string; swatch: string }[] = [
  { key: 'red', label: 'Rot', swatch: '#e5484d' },
  { key: 'orange', label: 'Orange', swatch: '#f76b15' },
  { key: 'yellow', label: 'Gelb', swatch: '#f5d90a' },
  { key: 'green', label: 'Grün', swatch: '#46a758' },
  { key: 'teal', label: 'Türkis', swatch: '#12a594' },
  { key: 'blue', label: 'Blau', swatch: '#3e63dd' },
  { key: 'purple', label: 'Lila', swatch: '#8e4ec6' },
  { key: 'pink', label: 'Pink', swatch: '#e93d82' },
  { key: 'mono', label: 'Grau', swatch: '#8b8d98' },
];

export interface WallpaperState {
  items: WallpaperItem[];
  activeId: string | null;
  viewMode: ViewMode;
  menuSide: MenuSide;
  menuMode: MenuMode;
  /** Delay (ms) before the auto-hide menu collapses again. */
  autoHideMs: number;
  dim: number;
  // --- Theme (appearance) ---
  schemeCharacter: SchemeCharacter;
  finish: Finish;
  paletteBehaviour: PaletteBehaviour;
  /** Seed used when paletteBehaviour === 'fixed'. */
  fixedSeed: string;
  /** Contrast level −1..1 (0 = default Material contrast). */
  themeContrast: number;
  /** Saved theming presets. */
  themePresets: ThemePreset[];
  /** Global UI scale 0.5–2.0. */
  uiScale: number;
  // --- OS wallpaper targets (native) ---
  setHome: boolean;
  setLock: boolean;
  // --- Wallpaper fit + gallery layout ---
  fillMode: FillMode;
  /** Gallery tile base size in px. */
  tileSize: number;
  /** Gallery tile corner radius in px. */
  tileRadius: number;
  // --- Auto rotation ---
  randomEnabled: boolean;
  randomIntervalSec: number;
  randomFavOnly: boolean;
  /** On auto-change, also set the real OS wallpaper (native). */
  randomSetHome: boolean;
  randomSetLock: boolean;
  // --- Transition on wallpaper change ---
  transitionType: TransitionType;
  transitionMs: number;
  // --- Devices ---
  /** Enable Android/phone-specific functions (set OS wallpaper, live wallpaper). */
  deviceMobile: boolean;
  /** Live wallpaper (animated OS background) — needs the native block. */
  liveWallpaper: boolean;
  // --- Collections / playlists ---
  collections: Collection[];
  /** Active collection filters gallery + auto-rotation pool; null = all. */
  activeCollectionId: string | null;
  // --- Time scheduling ---
  scheduleEnabled: boolean;
  schedule: ScheduleRule[];
  // --- Per-mode layout fine-tuning ---
  /** Wall: fixed column count; 0 = auto (fit by tile size). */
  wallColumns: number;
  /** Slices: skew angle in degrees. */
  slicesSkew: number;
  /** Slices: strip height (the N in aspect 24 / N — smaller = taller). */
  slicesHeight: number;
  /** Geometric: hex cell width in px; 0 = auto by viewport. */
  hexSize: number;
  /** Geometric: visible rows / columns, scroll step, arc layout + intensity (×10). */
  hexRows: number;
  hexColumns: number;
  hexScrollStep: number;
  hexArc: boolean;
  hexArcIntensity: number;
  /** Slices: show a larger featured tile in the centre. */
  slicesFeatured: boolean;
  /** Depth: perspective tilt angle in degrees. */
  depthTilt: number;
  /** Card hand: fan spread, degrees per card. */
  handSpread: number;
  /** Geometry presets C1–C4 (null = empty slot). */
  geometryPresets: (GeometryPreset | null)[];
  // --- Video playback ---
  muteVideo: boolean;
  videoVolume: number; // 0–100
  // --- Auto-recolour new wallpapers ---
  autoRecolour: boolean;
  recolourPalette: string;
  // --- Selector behaviour ---
  closeOnSelection: boolean;
  alwaysFilterBar: boolean;
  alwaysSearchBar: boolean;
  // --- Random pool content ---
  includeImages: boolean;
  includeVideos: boolean;
  // --- Theme ---
  /** Which palette slot to seed the theme from (0 = primary). */
  sourceColourIndex: number;
  // --- Transitions ---
  /** Pick a random GPU shader for every transition. */
  randomShader: boolean;
  // --- Wallhaven ---
  whColumns: number;
  whApiKey: string;
  // --- Trash ---
  trashedItems: TrashItem[];
  trashRetentionDays: number;
  trashAutoDelete: boolean;
}

export const DEFAULT_STATE: WallpaperState = {
  items: [],
  activeId: null,
  viewMode: 'wall',
  menuSide: 'right',
  menuMode: 'auto',
  autoHideMs: 2500,
  dim: 0.35,
  schemeCharacter: 'vibrant',
  finish: 'natural',
  paletteBehaviour: 'follow',
  fixedSeed: '#ff6b35',
  themeContrast: 0,
  themePresets: [],
  uiScale: 1,
  setHome: true,
  setLock: true,
  fillMode: 'cover',
  tileSize: 130,
  tileRadius: 10,
  randomEnabled: false,
  randomIntervalSec: 300,
  randomFavOnly: false,
  randomSetHome: false,
  randomSetLock: false,
  transitionType: 'fade',
  transitionMs: 600,
  deviceMobile: true,
  liveWallpaper: false,
  collections: [],
  activeCollectionId: null,
  scheduleEnabled: false,
  schedule: [],
  wallColumns: 0,
  slicesSkew: 9,
  slicesHeight: 7,
  hexSize: 0,
  hexRows: 3,
  hexColumns: 9,
  hexScrollStep: 1,
  hexArc: true,
  hexArcIntensity: 12,
  slicesFeatured: true,
  depthTilt: 8,
  handSpread: 7,
  geometryPresets: [null, null, null, null],
  muteVideo: true,
  videoVolume: 100,
  autoRecolour: false,
  recolourPalette: 'theme',
  closeOnSelection: false,
  alwaysFilterBar: false,
  alwaysSearchBar: false,
  includeImages: true,
  includeVideos: true,
  sourceColourIndex: 0,
  randomShader: false,
  whColumns: 3,
  whApiKey: '',
  trashedItems: [],
  trashRetentionDays: 30,
  trashAutoDelete: false,
};

export const VIEW_MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'slices', label: 'Slices', icon: 'rows' },
  { value: 'depth', label: 'Depth', icon: 'grid' },
  { value: 'geometric', label: 'Geometric', icon: 'hexagon' },
  { value: 'wall', label: 'Wall', icon: 'grid' },
  { value: 'sandy', label: 'Sandy', icon: 'image' },
  { value: 'hand', label: 'Card hand', icon: 'rows' },
  { value: 'collection', label: 'Collection', icon: 'grid' },
];
