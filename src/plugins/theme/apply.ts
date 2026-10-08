import type { App } from '@core/index';
import type { ThemeSet } from './types';
import { generateTokens, generatePalette } from './palette';

/** Apply a theme set to the DOM for the given resolved light/dark mode. */
export function applySet(app: App, set: ThemeSet, resolved: 'light' | 'dark'): void {
  const tokens = generateTokens(set.accent, resolved);

  // Radius scale from a single base value.
  const r = set.radius;
  tokens['radius-sm'] = `${Math.max(2, Math.round(r * 0.6))}px`;
  tokens['radius-md'] = `${r}px`;
  tokens['radius-lg'] = `${Math.round(r * 1.6)}px`;

  // Font.
  tokens['font-ui'] = set.font;

  // Density → spacing scale.
  const d = set.density === 'compact' ? 0.72 : 1;
  tokens['space-1'] = `${Math.round(4 * d)}px`;
  tokens['space-2'] = `${Math.round(8 * d)}px`;
  tokens['space-3'] = `${Math.round(12 * d)}px`;
  tokens['space-4'] = `${Math.round(16 * d)}px`;
  tokens['space-5'] = `${Math.round(24 * d)}px`;
  tokens['space-6'] = `${Math.round(32 * d)}px`;

  // Animations.
  tokens['transition'] =
    set.animations === 'off'
      ? '0ms'
      : set.animations === 'reduced'
        ? '90ms ease'
        : '160ms cubic-bezier(0.4, 0, 0.2, 1)';

  app.theme.setTokens(tokens);
  app.theme.setMode(set.mode);

  // Publish the semantic palette so every plugin can read the roles.
  app.theme.setPalette(generatePalette(set.accent, resolved));

  // Wallpaper (platform-appropriate image) via the shared kernel layer.
  const wallpaper =
    (app.platform.isMobile ? set.wallpaperMobile : set.wallpaperDesktop) ??
    set.wallpaperDesktop ??
    set.wallpaperMobile ??
    null;
  app.theme.setWallpaper({ url: wallpaper, dim: set.wallpaperDim });

  document.documentElement.dataset.anim = set.animations;
}
