/**
 * Platform wiring — the one place that installs the platform-specific
 * capability implementations into the universal core.
 *
 * Only capabilities the CURRENT platform actually supports are registered, so
 * `app.capabilities.has(x)` is an honest runtime check. A macOS/web build that
 * can't set an Android wallpaper simply never registers those backends; plugins
 * see `has('wallpaper') === false` and hide that affordance.
 *
 * Kept out of `src/core` on purpose: the core must stay platform-agnostic.
 * The composition root (`main.ts`) calls this once, before plugins load.
 */
import type { App } from '@core/index';
import { isNativeApp, wallpaperCapability, liveWallpaperCapability } from './wallpaper';
import { supportsFolders, foldersCapability } from './folders';

export function installCapabilities(app: App): void {
  if (supportsFolders()) {
    app.capabilities.register('folders', foldersCapability);
  }
  // Static + GL live wallpaper are native-only (the Capacitor `Wallpaper`
  // plugin). Web/desktop can't touch the OS wallpaper, so they stay unregistered.
  if (isNativeApp()) {
    app.capabilities.register('wallpaper', wallpaperCapability);
    app.capabilities.register('live-wallpaper', liveWallpaperCapability);
  }
}
