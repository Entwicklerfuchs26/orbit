import { View } from '@core/index';
import type { App } from '@core/index';
import type { SojusApp } from '@core/app';
import { mount, unmount } from 'svelte';
import ShellHome from './ShellHome.svelte';

export interface HomeCallbacks {
  onOpenPlugins: () => void;
  onOpenSettings: () => void;
  openView: (viewId: string) => void;
}

/**
 * The Orbit home / landing view. A core (shell) view — reachable via the Orbit
 * wordmark + a "Start" entry in the sidebar — so the user can always leave a
 * plugin and switch back, even in single-view mode where there's no tab bar.
 */
export class HomeView extends View {
  static readonly ID = 'orbit-home';
  private comp: ReturnType<typeof mount> | null = null;

  constructor(
    app: App,
    private cbs: HomeCallbacks,
  ) {
    super(app);
  }

  getViewType() {
    return HomeView.ID;
  }
  getDisplayName() {
    return 'Start';
  }
  getIcon() {
    return 'home';
  }
  async onOpen() {
    this.comp = mount(ShellHome, {
      target: this.containerEl,
      props: { app: this.app as unknown as SojusApp, ...this.cbs },
    });
  }
  async onClose() {
    if (this.comp) {
      unmount(this.comp);
      this.comp = null;
    }
  }
}
