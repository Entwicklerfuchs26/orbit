import {
  argbFromHex,
  hexFromArgb,
  Hct,
  TonalPalette,
  QuantizerCelebi,
  Score,
  MaterialDynamicColors,
  SchemeTonalSpot,
  SchemeVibrant,
  SchemeExpressive,
  SchemeNeutral,
  SchemeMonochrome,
  SchemeFidelity,
  SchemeContent,
  SchemeRainbow,
  SchemeFruitSalad,
} from '@material/material-color-utilities';
import type { PaletteRoles } from '@core/index';

export type Mode = 'light' | 'dark';

export type SchemeCharacter =
  | 'tonal_spot'
  | 'vibrant'
  | 'expressive'
  | 'neutral'
  | 'monochrome'
  | 'fidelity'
  | 'content'
  | 'rainbow'
  | 'fruit_salad';

export type Finish = 'natural' | 'pastel' | 'muted' | 'vibrant';

export const SCHEME_CHARACTERS: { value: SchemeCharacter; label: string }[] = [
  { value: 'tonal_spot', label: 'Tonal' },
  { value: 'vibrant', label: 'Vibrant' },
  { value: 'expressive', label: 'Expressive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'fidelity', label: 'Fidelity' },
  { value: 'content', label: 'Content' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'fruit_salad', label: 'Fruit Salad' },
];

export const FINISHES: { value: Finish; label: string }[] = [
  { value: 'natural', label: 'Natürlich' },
  { value: 'pastel', label: 'Pastell' },
  { value: 'muted', label: 'Gedämpft' },
  { value: 'vibrant', label: 'Kräftig' },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
const SCHEME_CTORS: Record<SchemeCharacter, any> = {
  tonal_spot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  fruit_salad: SchemeFruitSalad,
};

/**
 * Generate the FULL theme (UI chrome tokens + semantic palette roles) from a
 * seed colour, via Material You 3 dynamic schemes — so the whole app can take
 * on the wallpaper's colour, SKWD-style. `character` picks the scheme flavour;
 * `finish` adjusts source chroma (pastel/muted/vibrant).
 */
export function generateTheme(
  seedHex: string,
  mode: Mode,
  character: SchemeCharacter = 'vibrant',
  finish: Finish = 'natural',
  contrast = 0,
): { tokens: Record<string, string>; roles: PaletteRoles } {
  let argb: number;
  try {
    argb = argbFromHex(seedHex);
  } catch {
    argb = argbFromHex('#ff6b35');
  }
  let hct = Hct.fromInt(argb);
  const mul = finish === 'pastel' ? 0.5 : finish === 'muted' ? 0.3 : finish === 'vibrant' ? 1.6 : 1;
  if (mul !== 1) hct = Hct.from(hct.hue, Math.min(hct.chroma * mul, 120), hct.tone);

  const Ctor = SCHEME_CTORS[character] ?? SchemeVibrant;
  const isDark = mode === 'dark';
  const scheme = new Ctor(hct, isDark, Math.max(-1, Math.min(1, contrast)));
  const C: any = MaterialDynamicColors;
  const hx = (c: any) => hexFromArgb(c.getArgb(scheme));

  const primHct = Hct.fromInt(C.primary.getArgb(scheme));
  const hover = hexFromArgb(
    Hct.from(
      primHct.hue,
      primHct.chroma,
      isDark ? Math.min(primHct.tone + 8, 100) : Math.max(primHct.tone - 8, 0),
    ).toInt(),
  );

  const tokens: Record<string, string> = {
    bg: hx(C.surface),
    'bg-elevated': hx(C.surfaceContainer),
    'bg-hover': hx(C.surfaceContainerHigh),
    'bg-active': hx(C.surfaceContainerHighest),
    border: hx(C.outlineVariant),
    text: hx(C.onSurface),
    'text-muted': hx(C.onSurfaceVariant),
    'text-faint': hx(C.outline),
    accent: hx(C.primary),
    'accent-hover': hover,
    'accent-text': hx(C.onPrimary),
    shadow: isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.12)',
  };

  const roles: PaletteRoles = {
    primary: hx(C.primary),
    secondary: hx(C.secondary),
    tertiary: hx(C.tertiary),
    surface: hx(C.surface),
    surfaceVariant: hx(C.surfaceContainerHighest),
    outline: hx(C.outline),
    onSurface: hx(C.onSurface),
  };

  return { tokens, roles };
}

/** Semantic colour roles (primary/secondary/tertiary/surface …) from a seed. */
export function generatePalette(seedHex: string, mode: Mode): PaletteRoles {
  let seed: number;
  try {
    seed = argbFromHex(seedHex);
  } catch {
    seed = argbFromHex('#ff6b35');
  }
  const src = Hct.fromInt(seed);
  const hue = src.hue;
  const chroma = src.chroma;

  const primary = TonalPalette.fromHueAndChroma(hue, Math.max(chroma, 48));
  const secondary = TonalPalette.fromHueAndChroma(hue, 16);
  const tertiary = TonalPalette.fromHueAndChroma((hue + 60) % 360, 24);
  const neutral = TonalPalette.fromHueAndChroma(hue, 4);
  const variant = TonalPalette.fromHueAndChroma(hue, 8);
  const hex = (p: TonalPalette, t: number) => hexFromArgb(p.tone(t));

  if (mode === 'dark') {
    return {
      primary: hex(primary, 72),
      secondary: hex(secondary, 70),
      tertiary: hex(tertiary, 72),
      surface: hex(neutral, 12),
      surfaceVariant: hex(variant, 22),
      outline: hex(variant, 40),
      onSurface: hex(neutral, 92),
    };
  }
  return {
    primary: hex(primary, 44),
    secondary: hex(secondary, 40),
    tertiary: hex(tertiary, 40),
    surface: hex(neutral, 98),
    surfaceVariant: hex(variant, 90),
    outline: hex(variant, 50),
    onSurface: hex(neutral, 12),
  };
}

/**
 * Derive a full, consistent token palette from a single seed colour, Material-
 * You style. Keys match the kernel's CSS custom properties (without the `--`).
 */
export function generateTokens(seedHex: string, mode: Mode): Record<string, string> {
  let seed: number;
  try {
    seed = argbFromHex(seedHex);
  } catch {
    seed = argbFromHex('#ff6b35');
  }

  const src = Hct.fromInt(seed);
  const hue = src.hue;
  const chroma = src.chroma;

  const primary = TonalPalette.fromHueAndChroma(hue, Math.max(chroma, 48));
  const neutral = TonalPalette.fromHueAndChroma(hue, 4);
  const variant = TonalPalette.fromHueAndChroma(hue, 8);

  const hex = (p: TonalPalette, tone: number) => hexFromArgb(p.tone(tone));

  if (mode === 'dark') {
    const accentTone = 72;
    return {
      bg: hex(neutral, 8),
      'bg-elevated': hex(neutral, 12),
      'bg-hover': hex(variant, 20),
      'bg-active': hex(variant, 26),
      border: hex(variant, 24),
      text: hex(neutral, 92),
      'text-muted': hex(variant, 72),
      'text-faint': hex(variant, 52),
      accent: hex(primary, accentTone),
      'accent-hover': hex(primary, accentTone + 8),
      'accent-text': hex(primary, accentTone >= 60 ? 12 : 98),
      shadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
    };
  }

  const accentTone = 44;
  return {
    bg: hex(neutral, 98),
    'bg-elevated': hex(neutral, 100),
    'bg-hover': hex(variant, 94),
    'bg-active': hex(variant, 88),
    border: hex(variant, 85),
    text: hex(neutral, 12),
    'text-muted': hex(variant, 40),
    'text-faint': hex(variant, 55),
    accent: hex(primary, accentTone),
    'accent-hover': hex(primary, accentTone - 7),
    'accent-text': hex(primary, 100),
    shadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  };
}

/** Extract a dominant seed colour from an image (wallpaper → palette). */
export async function seedFromImage(src: string): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 128 / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const pixels: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 255) continue;
      // argb
      pixels.push((255 << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    }
    if (pixels.length === 0) return null;

    const quantized = QuantizerCelebi.quantize(pixels, 64);
    const ranked = Score.score(quantized);
    return ranked.length ? hexFromArgb(ranked[0]) : null;
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
