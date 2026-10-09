import type { NavigationItem } from './types';
import { Store } from './store';

export interface RegisteredNavItem extends NavigationItem {
  pluginId: string;
  viewId: string;
}

/**
 * Central registry for sidebar navigation items. Plugins add items via
 * their addNavigationItem helper; the shell renders this store reactively.
 */
export class Navigation {
  private items: Map<string, RegisteredNavItem> = new Map();
  readonly store = new Store<RegisteredNavItem[]>([]);

  register(item: RegisteredNavItem): void {
    this.items.set(item.id, item);
    this.sync();
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, item] of this.items) {
      if (item.pluginId === pluginId) this.items.delete(id);
    }
    this.sync();
  }

  getAll(): RegisteredNavItem[] {
    return [...this.items.values()].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );
  }

  /**
   * The view a plugin flagged as the default start page (lowest priority wins
   * when several do). Null if no plugin suggests one. This is only the seed
   * default — the user's choice in config overrides it (see app.restoreWorkspace).
   */
  defaultStartPageId(): string | null {
    const flagged = this.getAll().find((i) => i.isStartPage);
    return flagged?.viewId ?? null;
  }

  private sync(): void {
    this.store.set(this.getAll());
  }
}
