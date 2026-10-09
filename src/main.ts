import './styles/tokens.css';
import { mount } from 'svelte';
import { SojusApp } from '@core/app';
import Shell from '@shell/Shell.svelte';
import type { PluginModule } from '@core/loader';
import type { Bundle } from '@core/index';
import { installCapabilities } from '@platform/index';

// The APK/app bundles NO feature plugin — "alles ist ein Plugin" und alle Plugins
// kommen aus dem Store (orbit-plugins). Der Kern bootet leer; Onboarding bzw. der
// Plugins-Bereich installieren alles zur Laufzeit. (Plugin-Quellcode lebt weiter in
// src/plugins/ und wird separat via scripts/assemble-registry.mjs gebaut.)
const modules: PluginModule[] = [];

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

  // First run = truly empty config → onboarding (bundle picker, installs from the
  // store). Existing testers (config already populated) are marked onboarded so the
  // dialog doesn't interrupt them; their plugins return when (re)installed from the
  // store (same plugin id → existing config/IndexedDB is reused, library intact).
  const fresh = Object.keys(app.config.getAll().plugins).length === 0;
  if (!fresh && app.config.get('core', 'onboarded') === undefined) {
    app.config.set('core', 'onboarded', true);
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
