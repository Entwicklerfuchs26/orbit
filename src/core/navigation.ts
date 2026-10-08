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

  private sync(): void {
    this.store.set(this.getAll());
  }
}
