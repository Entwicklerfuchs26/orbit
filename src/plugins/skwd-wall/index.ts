import { Plugin, View } from '@core/index';
import type { App, PluginManifest } from '@core/index';
import { mount, unmount } from 'svelte';
import { WallpaperManager } from './manager';
import Picker from './Picker.svelte';
import WallpaperSettings from './WallpaperSettings.svelte';
import Intro from './Intro.svelte';

export const manifest: PluginManifest = {
  id: 'skwd-wall',
  name: 'SKWD Wall',
  version: '0.1.0',
  description: 'SKWD-Wall aufs Handy: Wallpaper-Picker (eigene Bilder + Wallhaven), Ansichts-Modi, Farbschema automatisch aus dem Bild, Übergänge, Live-Wallpaper (nativ). Läuft überall.',
  author: 'Sojus',
  main: 'index.ts',
  type: 'gui',
  // GUI runs everywhere (testable in the browser); native wallpaper-setting
  // (phone) lands in a later block. Kept broad so desktop/web can preview.
  platforms: ['mobile', 'desktop', 'web'],
  // Powers it uses when present; it degrades gracefully where they're missing
  // (e.g. web can't set the OS wallpaper, a non-Chromium browser has no folders).
  capabilities: ['folders', 'wallpaper', 'live-wallpaper'],
};

const VIEW_ID = 'wallpaper-picker';

class PickerView extends View {
  private component: ReturnType<typeof mount> | null = null;
  private intro: ReturnType<typeof mount> | null = null;
  constructor(app: App, private manager: WallpaperManager) {
    super(app);
  }
  getViewType() {
    return VIEW_ID;
  }
  getDisplayName() {
    return 'SKWD Wall';
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

    // First-run intro: a full-screen click-through that explains the plugin.
    // Phone-only (it's about the swipe rail, live wallpaper, home screen) and
    // shown once; flag persisted in the plugin's own config.
    if (
      this.app.platform.isMobile &&
      this.app.config.get<boolean>('skwd-wall', 'introSeen') !== true
    ) {
      this.intro = mount(Intro, {
        target: this.containerEl,
        props: {
          app: this.app,
          onDone: () => {
            this.app.config.set('skwd-wall', 'introSeen', true);
            if (this.intro) {
              unmount(this.intro);
              this.intro = null;
            }
          },
        },
      });
    }
  }
  async onClose() {
    if (this.intro) {
      unmount(this.intro);
      this.intro = null;
    }
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
      name: 'SKWD Wall',
      icon: 'image',
      priority: 5,
      // The star feature — the sensible default home until the user picks another.
      isStartPage: true,
    });

    this.addCommand({
      id: 'open',
      name: 'SKWD Wall öffnen',
      callback: () => this.app.workspace.openView(VIEW_ID),
    });

    // Replayable onboarding — the shell's Plugins area offers an "Einführung"
    // button for any plugin that registers a `show-intro` command.
    this.addCommand({
      id: 'show-intro',
      name: 'Einführung anzeigen',
      callback: () => {
        this.app.config.set('skwd-wall', 'introSeen', false);
        this.app.workspace.closeView(VIEW_ID);
        this.app.workspace.openView(VIEW_ID);
      },
    });

    // Wipe the plugin's data — the Plugins area offers a "Daten löschen" button
    // for any plugin that registers a `clear-data` command.
    this.addCommand({
      id: 'clear-data',
      name: 'Daten löschen',
      callback: () => {
        void this.manager.clearAllData();
      },
    });

    // Same settings, reachable from global Settings → Plugins → gear.
    let settingsComponent: ReturnType<typeof mount> | null = null;
    this.addSettingTab({
      id: 'wallpaper-settings',
      name: 'SKWD Wall',
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
