import { Plugin, View } from '@core/index';
import type { App, PluginManifest } from '@core/index';
import { mount, unmount } from 'svelte';
import { WallpaperManager } from './manager';
import Picker from './Picker.svelte';
import WallpaperSettings from './WallpaperSettings.svelte';

export const manifest: PluginManifest = {
  id: 'wallpaper',
  name: 'Wallpaper',
  version: '0.1.0',
  description: 'Wallpaper-Picker im SKWD-Wall-Look. Eigene Bilder, Ansichts-Modi, Farbschema automatisch aus dem Bild. Läuft überall; echtes OS-Wallpaper-Setzen kommt am Handy.',
  author: 'Sojus',
  main: 'index.ts',
  type: 'gui',
  // GUI runs everywhere (testable in the browser); native wallpaper-setting
  // (phone) lands in a later block. Kept broad so desktop/web can preview.
  platforms: ['mobile', 'desktop', 'web'],
};

const VIEW_ID = 'wallpaper-picker';

class PickerView extends View {
  private component: ReturnType<typeof mount> | null = null;
  constructor(app: App, private manager: WallpaperManager) {
    super(app);
  }
  getViewType() {
    return VIEW_ID;
  }
  getDisplayName() {
    return 'Wallpaper';
  }
  getIcon() {
    return 'image';
  }
  async onOpen() {
    this.component = mount(Picker, {
      target: this.containerEl,
      props: {
        app: this.app,
        manager: this.manager,
      },
    });
  }
  async onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
  }
}

export default class WallpaperPlugin extends Plugin {
  private manager!: WallpaperManager;

  constructor(app: App, m: PluginManifest) {
    super(app, m);
  }

  async onload() {
    this.manager = new WallpaperManager(this.app);
    await this.manager.start();

    this.registerView(VIEW_ID, () => new PickerView(this.app, this.manager));

    this.addNavigationItem({
      id: VIEW_ID,
      name: 'Wallpaper',
      icon: 'image',
      priority: 5,
    });

    this.addCommand({
      id: 'open',
      name: 'Wallpaper-Picker öffnen',
      callback: () => this.app.workspace.openView(VIEW_ID),
    });

    // Same settings, reachable from global Settings → Plugins → gear.
    let settingsComponent: ReturnType<typeof mount> | null = null;
    this.addSettingTab({
      id: 'wallpaper-settings',
      name: 'Wallpaper',
      icon: 'image',
      render: (el) => {
        settingsComponent = mount(WallpaperSettings, {
          target: el,
          props: { app: this.app, manager: this.manager },
        });
      },
      hide: () => {
        if (settingsComponent) {
          unmount(settingsComponent);
          settingsComponent = null;
        }
      },
    });
  }

  async onunload() {
    this.manager.stop();
  }
}
