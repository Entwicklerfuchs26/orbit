import { Store } from './store';
import type { PaletteRoles, WallpaperInfo } from './types';
import { isGlTransition, runGlTransition } from './gl-transition';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeTokens {
  [key: string]: string;
}

const DEFAULT_PALETTE: PaletteRoles = {
  primary: '#ff6b35',
  secondary: '#5b8def',
  tertiary: '#9b6bff',
  surface: '#1e2128',
  surfaceVariant: '#272b33',
  outline: '#2a2e37',
  onSurface: '#e6e8ec',
};

const WALLPAPER_ID = 'app-wallpaper';

/**
 * The theme engine owns the shared theming state: CSS custom properties, the
 * resolved light/dark mode, the active colour palette, and the active
 * wallpaper. Theme/wallpaper plugins PUBLISH into it; every other plugin READS
 * from it (app.theme.palette / app.theme.wallpaper) to stay consistent.
 */
export class ThemeEngine {
  readonly mode = new Store<ThemeMode>('auto');
  readonly tokens = new Store<ThemeTokens>({});
  /** The actually-applied light/dark value (resolves 'auto' against the OS). */
  readonly resolved = new Store<'light' | 'dark'>('dark');
  /** Active colour roles — any plugin can read these to tint itself. */
  readonly palette = new Store<PaletteRoles>(DEFAULT_PALETTE);
  /** Active wallpaper — any plugin can reuse it (chat bg, etc.). */
  readonly wallpaper = new Store<WallpaperInfo>({ url: null, dim: 0 });

  private media = window.matchMedia('(prefers-color-scheme: dark)');

  init(): void {
    this.media.addEventListener('change', () => {
      if (this.mode.get() === 'auto') this.applyMode();
    });
    this.applyMode();
    this.setPalette(DEFAULT_PALETTE);
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.applyMode();
  }

  resolvedMode(): 'light' | 'dark' {
    const m = this.mode.get();
    if (m === 'auto') return this.media.matches ? 'dark' : 'light';
    return m;
  }

  setTokens(tokens: ThemeTokens): void {
    this.tokens.set(tokens);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(`--${key}`, value);
    }
  }

  /** Publish the colour roles + expose them as global CSS vars. */
  setPalette(roles: PaletteRoles): void {
    this.palette.set(roles);
    const root = document.documentElement;
    root.style.setProperty('--color-primary', roles.primary);
    root.style.setProperty('--color-secondary', roles.secondary);
    root.style.setProperty('--color-tertiary', roles.tertiary);
    root.style.setProperty('--color-surface', roles.surface);
    root.style.setProperty('--color-surface-variant', roles.surfaceVariant);
    root.style.setProperty('--color-outline', roles.outline);
    root.style.setProperty('--color-on-surface', roles.onSurface);
  }

  /** Publish the wallpaper + render it as the global background layer. */
  setWallpaper(info: WallpaperInfo): void {
    const prev = this.wallpaper.get();
    this.wallpaper.set(info);
    const root = document.documentElement;
    root.style.setProperty('--wallpaper-url', info.url ? `url("${info.url}")` : 'none');
    // Content areas go transparent so the wallpaper shows through.
    root.style.setProperty('--view-bg', info.url ? 'transparent' : 'var(--bg-elevated)');

    let layer = document.getElementById(WALLPAPER_ID);
    if (!info.url) {
      if (layer) layer.remove();
      root.classList.remove('has-wallpaper');
      return;
    }
    if (!layer) {
      layer = document.createElement('div');
      layer.id = WALLPAPER_ID;
      layer.innerHTML = '<div class="wp-dim"></div>';
      document.body.appendChild(layer);
    }
    root.classList.add('has-wallpaper');
    const overlay = layer.querySelector('.wp-dim') as HTMLElement | null;
    if (overlay) overlay.style.opacity = String(info.dim);

    // Video wallpaper: manage a looping muted <video> layer instead of a CSS
    // background image. Transitions don't apply — the source is swapped directly.
    const existingVid = layer.querySelector('video.wp-video') as HTMLVideoElement | null;
    if (info.kind === 'video') {
      layer.style.backgroundImage = 'none';
      let v = existingVid;
      if (!v) {
        v = document.createElement('video');
        v.className = 'wp-video';
        v.muted = true;
        v.loop = true;
        v.autoplay = true;
        v.setAttribute('playsinline', '');
        layer.insertBefore(v, layer.firstChild);
      }
      if (v.getAttribute('src') !== info.url) {
        v.setAttribute('src', info.url!);
        void v.play().catch(() => {});
      }
      return;
    }
    if (existingVid) existingVid.remove();

    const tr = info.transition;
    const changed = !!prev.url && !!info.url && prev.url !== info.url;
    if (!changed || !tr || tr.type === 'none') {
      layer.style.backgroundImage = `url("${info.url}")`;
      return;
    }
    const url = info.url;
    const base = layer;
    if (isGlTransition(tr.type)) {
      void runGlTransition(prev.url!, url, tr.type, tr.ms, () => {
        base.style.backgroundImage = `url("${url}")`;
      });
      return;
    }
    this.transitionWallpaper(base, url, tr.type as 'fade' | 'slide' | 'zoom' | 'wipe', tr.ms);
  }

  /** Animate the wallpaper swap via a temporary top layer. */
  private transitionWallpaper(
    base: HTMLElement,
    url: string,
    type: 'fade' | 'slide' | 'zoom' | 'wipe',
    ms: number,
  ): void {
    const next = document.createElement('div');
    next.style.cssText =
      'position:fixed;inset:0;z-index:-1;pointer-events:none;' +
      'background-size:var(--wallpaper-size,cover);background-position:var(--wallpaper-position,center);' +
      'background-repeat:var(--wallpaper-repeat,no-repeat);' +
      `background-image:url("${url}")`;
    if (type === 'fade') next.style.opacity = '0';
    else if (type === 'slide') next.style.transform = 'translateX(100%)';
    else if (type === 'zoom') {
      next.style.opacity = '0';
      next.style.transform = 'scale(1.15)';
    } else if (type === 'wipe') next.style.clipPath = 'inset(0 100% 0 0)';
    document.body.appendChild(next);
    void next.offsetWidth; // force reflow so the start state applies
    next.style.transition = `opacity ${ms}ms ease, transform ${ms}ms ease, clip-path ${ms}ms ease`;
    next.style.opacity = '1';
    next.style.transform = 'none';
    next.style.clipPath = 'inset(0 0 0 0)';
    window.setTimeout(() => {
      base.style.backgroundImage = `url("${url}")`;
      next.remove();
    }, ms + 60);
  }

  private applyMode(): void {
    const resolved = this.resolvedMode();
    document.documentElement.dataset.theme = resolved;
    this.resolved.set(resolved);
  }
}
