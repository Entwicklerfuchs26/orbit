import type { Workspace as IWorkspace, View } from './types';
import { Store } from './store';

export interface TabState {
  id: string;
  viewId: string;
  title: string;
  icon: string;
}

export class WorkspaceManager implements IWorkspace {
  private viewFactories: Map<string, () => View> = new Map();
  private activeViews: Map<string, View> = new Map();

  readonly tabs = new Store<TabState[]>([]);
  readonly activeTabId = new Store<string | null>(null);
  /** Multitasking tabs on/off. Off (default) = only one view open at a time. */
  readonly multitaskStore = new Store<boolean>(false);
  private multitask = false;

  registerView(id: string, factory: () => View): void {
    this.viewFactories.set(id, factory);
  }

  /** Toggle multitasking tabs. When turned off, collapse to the active view. */
  setMultitask(on: boolean): void {
    this.multitask = on;
    this.multitaskStore.set(on);
    if (!on) {
      const keep = this.activeTabId.get();
      if (keep) this.closeOthers(keep);
    }
  }

  private closeOthers(keepId: string): void {
    for (const id of [...this.activeViews.keys()]) {
      if (id !== keepId) this.closeView(id);
    }
  }

  openView(id: string): void {
    if (!this.activeViews.has(id)) {
      const factory = this.viewFactories.get(id);
      if (!factory) return;
      const view = factory();
      this.activeViews.set(id, view);
      this.tabs.update((tabs) => [
        ...tabs,
        { id, viewId: id, title: view.getDisplayName(), icon: view.getIcon() },
      ]);
    }
    // Single-view mode: opening a view closes any other open one.
    if (!this.multitask) this.closeOthers(id);
    this.setActiveView(id);
  }

  closeView(id: string): void {
    const view = this.activeViews.get(id);
    if (!view) return;

    view.onClose();
    this.activeViews.delete(id);

    this.tabs.update((tabs) => tabs.filter((t) => t.id !== id));

    if (this.activeTabId.get() === id) {
      const remaining = this.tabs.get();
      this.activeTabId.set(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  }

  getActiveView(): View | null {
    const activeId = this.activeTabId.get();
    if (!activeId) return null;
    return this.activeViews.get(activeId) ?? null;
  }

  getView(id: string): View | null {
    return this.activeViews.get(id) ?? null;
  }

  setActiveView(id: string): void {
    if (this.activeViews.has(id)) {
      this.activeTabId.set(id);
    }
  }

  getAllViews(): Map<string, View> {
    return this.activeViews;
  }

  hasView(id: string): boolean {
    return this.viewFactories.has(id);
  }
}
