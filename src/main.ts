import './styles/tokens.css';
import { mount } from 'svelte';
import { SojusApp } from '@core/app';
import Shell from '@shell/Shell.svelte';
import type { PluginModule } from '@core/loader';

// Phase 1: plugins are statically imported. Later phases load them from
// GitHub links / a registry at runtime.
import WelcomePlugin, { manifest as welcomeManifest } from './plugins/welcome/index';
import ThemePlugin, { manifest as themeManifest } from './plugins/theme/index';
import WallpaperPlugin, { manifest as wallpaperManifest } from './plugins/wallpaper/index';

const modules: PluginModule[] = [
  { manifest: welcomeManifest, default: WelcomePlugin },
  { manifest: themeManifest, default: ThemePlugin },
  { manifest: wallpaperManifest, default: WallpaperPlugin },
];

async function main() {
  const app = new SojusApp();

  // Load persisted config BEFORE seeding. Otherwise the seed runs on an empty
  // in-memory config and save() would clobber the stored config on every
  // reload (this was wiping uploaded wallpapers).
  app.config.load();

  // First-run seed: welcome + wallpaper (the star). Theme-color plugin stays
  // registered but off by default to avoid two theming sources fighting.
  if (Object.keys(app.config.getAll().plugins).length === 0) {
    app.config.enablePlugin('welcome');
    app.config.enablePlugin('wallpaper');
  }
  // Dev convenience: ensure the new wallpaper plugin is on for existing testers
  // whose config predates it.
  if (app.config.getPluginConfig('wallpaper') === undefined) {
    app.config.enablePlugin('wallpaper');
  }

  await app.boot(modules);

  mount(Shell, {
    target: document.getElementById('app')!,
    props: { app },
  });

  // Expose for debugging in the browser console.
  (window as any).sojus = app;
}

main();
