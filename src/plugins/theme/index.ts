import { Plugin, View } from '@core/index';
import type { App, PluginManifest } from '@core/index';
import { mount, unmount } from 'svelte';
import { ThemeManager } from './manager';
import SetEditor from './SetEditor.svelte';

export const manifest: PluginManifest = {
  id: 'theme',
  name: 'Design',
  version: '0.1.0',
  description: 'Theme-Sets: Farbe, Hell/Dunkel, Wallpaper, Schrift, Dichte, Animationen. Palette aus einer Farbe oder einem Wallpaper (Material You).',
  author: 'Sojus',
  main: 'index.ts',
  type: 'theme',
};

class DesignView extends View {
  private component: ReturnType<typeof mount> | null = null;
  constructor(app: App, private manager: ThemeManager) {
    super(app);
  }
  getViewType() {
    return 'theme-design';
  }
  getDisplayName() {
    return 'Design';
  }
  getIcon() {
    return 'palette';
  }
  async onOpen() {
    this.component = mount(SetEditor, {
      target: this.containerEl,
      props: { app: this.app, manager: this.manager },
    });
  }
  async onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
  }
}

export default class ThemePlugin extends Plugin {
  private manager!: ThemeManager;

  constructor(app: App, m: PluginManifest) {
    super(app, m);
  }

  async onload() {
    this.manager = new ThemeManager(this.app);
    this.manager.start();

    this.registerView('theme-design', () => new DesignView(this.app, this.manager));

    this.addNavigationItem({
      id: 'theme-design',
      name: 'Design',
      icon: 'palette',
      priority: 10,
    });

    this.addCommand({
      id: 'open',
      name: 'Design öffnen',
      callback: () => this.app.workspace.openView('theme-design'),
    });

    this.addCommand({
      id: 'toggle-mode',
      name: 'Design: Hell/Dunkel umschalten',
      callback: () => {
        const next = this.app.theme.resolvedMode() === 'dark' ? 'light' : 'dark';
        this.app.theme.setMode(next);
        this.manager.applyActive();
      },
    });
  }

  async onunload() {
    this.manager.stop();
  }
}
