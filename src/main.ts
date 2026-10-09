import './styles/tokens.css';
import { mount } from 'svelte';
import { SojusApp } from '@core/app';
import Shell from '@shell/Shell.svelte';
import type { PluginModule } from '@core/loader';
import { installCapabilities } from '@platform/index';

// Phase 1: plugins are statically imported. Later phases load them from
// GitHub links / a registry at runtime.
import WelcomePlugin, { manifest as welcomeManifest } from './plugins/welcome/index';
import ThemePlugin, { manifest as themeManifest } from './plugins/theme/index';
import SkwdWallPlugin, { manifest as skwdWallManifest } from './plugins/skwd-wall/index';

const modules: PluginModule[] = [
  { manifest: welcomeManifest, default: WelcomePlugin },
  { manifest: themeManifest, default: ThemePlugin },
  { manifest: skwdWallManifest, default: SkwdWallPlugin },
];

async function main() {
  const app = new SojusApp();

  // Load persisted config BEFORE seeding. Otherwise the seed runs on an empty
  // in-memory config and save() would clobber the stored config on every
  // reload (this was wiping uploaded wallpapers).
  app.config.load();

  // Migration: the wallpaper plugin was renamed 'wallpaper' → 'skwd-wall'.
  // Carry over existing saved state (library, settings) so nothing is lost.
  const cfg = app.config.getAll();
  if (cfg.plugins['wallpaper'] && !cfg.plugins['skwd-wall']) {
    cfg.plugins['skwd-wall'] = cfg.plugins['wallpaper'];
    delete cfg.plugins['wallpaper'];
    app.config.save();
  }

  // First-run seed: welcome + SKWD Wall (the star). Theme-color plugin stays
  // registered but off by default to avoid two theming sources fighting.
  if (Object.keys(app.config.getAll().plugins).length === 0) {
    app.config.enablePlugin('welcome');
    app.config.enablePlugin('skwd-wall');
  }
  // Dev convenience: ensure the plugin is on for existing testers whose config
  // predates it.
  if (app.config.getPluginConfig('skwd-wall') === undefined) {
    app.config.enablePlugin('skwd-wall');
  }

  // Install the platform-specific capabilities BEFORE plugins load, so a plugin
  // can query app.capabilities.has(...) inside its onload().
  installCapabilities(app);

  await app.boot(modules);

  mount(Shell, {
    target: document.getElementById('app')!,
    props: { app },
  });

  // Expose for debugging in the browser console.
  (window as any).sojus = app;
}

main();
