// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN TEMPLATE — copy this folder to src/plugins/<your-id>/ and adapt.
//
// A plugin is a self-contained feature. The core (src/core) knows NOTHING about
// features — it only loads plugins, opens their views, and routes commands.
//
// To activate a new plugin, register it in src/main.ts (static import for now;
// a GitHub-based store comes later). See CONVENTIONS.md for the full guide.
// ─────────────────────────────────────────────────────────────────────────────
import { Plugin, View } from '@core/index';
import type { App, PluginManifest } from '@core/index';

export const manifest: PluginManifest = {
  id: 'template', // unique, kebab-case; this is the config/storage key — keep it stable
  name: 'Vorlage',
  version: '0.1.0',
  description: 'Vorlage für ein Plugin — zeigt View + Menüpunkt + Command.',
  author: 'Sojus',
  main: 'index.ts',
  type: 'gui',
  // Which platforms this plugin supports. Omit = all.
  platforms: ['mobile', 'desktop', 'web'],
};

/** A View is one screen/tab the plugin can open in the shell. */
class TemplateView extends View {
  getViewType() {
    return 'template';
  }
  getDisplayName() {
    return 'Vorlage';
  }
  getIcon() {
    return 'plugin';
  }

  // Render into this.containerEl. For real UI, mount a Svelte component here
  // (see src/plugins/skwd-wall/index.ts → mount(Picker, …)).
  async onOpen() {
    this.containerEl.innerHTML =
      '<div style="padding:40px;color:var(--text)">Hallo aus dem Vorlage-Plugin.</div>';
  }
  async onClose() {
    this.containerEl.innerHTML = '';
  }
}

export default class TemplatePlugin extends Plugin {
  constructor(app: App, m: PluginManifest) {
    super(app, m);
  }

  async onload() {
    const VIEW_ID = 'template';
    this.registerView(VIEW_ID, () => new TemplateView(this.app));
    this.addNavigationItem({ id: VIEW_ID, name: 'Vorlage', icon: 'plugin', priority: 50 });
    this.addCommand({
      id: 'open',
      name: 'Vorlage öffnen',
      callback: () => this.app.workspace.openView(VIEW_ID),
    });
  }

  async onunload() {
    // View cleanup is handled by the kernel.
  }
}
