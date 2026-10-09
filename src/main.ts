import './styles/tokens.css';
import { mount } from 'svelte';
import { SojusApp } from '@core/app';
import Shell from '@shell/Shell.svelte';
import type { PluginModule } from '@core/loader';
import type { Bundle } from '@core/index';
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

// Preset bundles for first-run onboarding. Defined here (composition root), not
// in the core — the core never names a specific plugin. "Eigenes" (free pick)
// is added by the onboarding dialog itself.
const bundles: Bundle[] = [
  {
    id: 'wall',
    name: 'SKWD Wall',
    description: 'Wallpaper-Picker mit eigenen Bildern + Wallhaven, Ansichtsmodi und automatischem Theme. Die Sternfunktion.',
    plugins: ['skwd-wall'],
    recommended: true,
  },
  {
    id: 'wall-design',
    name: 'Wallpaper + Design',
    description: 'SKWD Wall plus das Design-Plugin für eigene Theme-Sets (Farbe, Schrift, Dichte).',
    plugins: ['skwd-wall', 'theme'],
  },
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

  // First run = truly empty config. Fresh installs go through onboarding (the
  // bundle picker) instead of an auto-seed. Existing testers (config already
  // populated) are marked onboarded so the dialog never interrupts them, and
  // keep the dev convenience of having SKWD Wall on.
  const fresh = Object.keys(app.config.getAll().plugins).length === 0;
  if (!fresh) {
    if (app.config.getPluginConfig('skwd-wall') === undefined) {
      app.config.enablePlugin('skwd-wall');
    }
    if (app.config.get('core', 'onboarded') === undefined) {
      app.config.set('core', 'onboarded', true);
    }
  }

  // Install the platform-specific capabilities BEFORE plugins load, so a plugin
  // can query app.capabilities.has(...) inside its onload().
  installCapabilities(app);

  await app.boot(modules);

  mount(Shell, {
    target: document.getElementById('app')!,
    props: { app, bundles },
  });

  // Expose for debugging in the browser console.
  (window as any).sojus = app;
}

main();
