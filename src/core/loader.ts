import type { App, Plugin, PluginManifest } from './types';
import { Plugin as PluginBase } from './types';
import type { Config } from './config';
import { Store } from './store';

export interface PluginModule {
  manifest: PluginManifest;
  default: new (app: App, manifest: PluginManifest) => Plugin;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: Plugin;
}

/**
 * The PluginLoader is the heart of the kernel. It knows nothing about
 * specific plugins — it only registers plugin modules, resolves their
 * dependency order from the declarative config, and loads/unloads them.
 */
export class PluginLoader {
  private registered: Map<string, PluginModule> = new Map();
  private loaded: Map<string, LoadedPlugin> = new Map();

  readonly loadedStore = new Store<LoadedPlugin[]>([]);

  constructor(
    private app: App,
    private config: Config,
  ) {}

  /** Register a plugin module so it CAN be loaded (if enabled in config). */
  register(module: PluginModule): void {
    this.registered.set(module.manifest.id, module);
  }

  registerMany(modules: PluginModule[]): void {
    for (const m of modules) this.register(m);
  }

  get(id: string): Plugin | undefined {
    return this.loaded.get(id)?.instance;
  }

  getAll(): Plugin[] {
    return [...this.loaded.values()].map((p) => p.instance);
  }

  getAllLoaded(): LoadedPlugin[] {
    return [...this.loaded.values()];
  }

  isEnabled(id: string): boolean {
    return this.config.isPluginEnabled(id);
  }

  /** Whether a registered plugin supports the current platform. */
  supportsPlatform(id: string): boolean {
    const m = this.registered.get(id)?.manifest;
    if (!m?.platforms) return true;
    return m.platforms.includes(this.app.platform.type);
  }

  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  getRegistered(): PluginManifest[] {
    return [...this.registered.values()].map((m) => m.manifest);
  }

  /** Load all plugins that are enabled in the config, in dependency order. */
  async loadEnabled(): Promise<void> {
    const order = this.resolveLoadOrder();
    for (const id of order) {
      if (this.config.isPluginEnabled(id)) {
        await this.load(id);
      }
    }
  }

  async load(id: string): Promise<void> {
    if (this.loaded.has(id)) return;

    const module = this.registered.get(id);
    if (!module) {
      console.warn(`[loader] Plugin "${id}" is enabled but not registered.`);
      return;
    }

    if (!this.supportsPlatform(id)) {
      console.info(
        `[loader] Plugin "${id}" skipped — not for platform "${this.app.platform.type}".`,
      );
      return;
    }

    // Ensure dependencies are loaded first.
    for (const dep of module.manifest.dependencies ?? []) {
      if (!this.loaded.has(dep)) {
        if (this.registered.has(dep)) {
          await this.load(dep);
        } else {
          console.error(
            `[loader] Plugin "${id}" needs "${dep}" which is not registered. Skipping.`,
          );
          return;
        }
      }
    }

    try {
      const instance = new module.default(this.app, module.manifest);
      await instance.onload();
      this.loaded.set(id, { manifest: module.manifest, instance });
      this.syncStore();
      console.info(`[loader] Loaded plugin "${id}" (${module.manifest.name}).`);
    } catch (err) {
      console.error(`[loader] Failed to load plugin "${id}":`, err);
    }
  }

  async unload(id: string): Promise<void> {
    const loaded = this.loaded.get(id);
    if (!loaded) return;

    // Unload dependents first.
    for (const [otherId, other] of this.loaded) {
      if (other.manifest.dependencies?.includes(id)) {
        await this.unload(otherId);
      }
    }

    try {
      await loaded.instance.onunload();
      if (loaded.instance instanceof PluginBase) {
        loaded.instance.cleanup();
      }
    } catch (err) {
      console.error(`[loader] Error unloading "${id}":`, err);
    }

    this.loaded.delete(id);
    this.syncStore();
    console.info(`[loader] Unloaded plugin "${id}".`);
  }

  /** Toggle a plugin at runtime and persist the change to config. */
  async setEnabled(id: string, enable: boolean): Promise<void> {
    if (enable) {
      this.config.enablePlugin(id);
      await this.load(id);
    } else {
      this.config.disablePlugin(id);
      await this.unload(id);
    }
  }

  /** Topological sort of registered plugins by their dependencies. */
  private resolveLoadOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        console.error(`[loader] Circular dependency detected at "${id}".`);
        return;
      }
      const module = this.registered.get(id);
      if (!module) return;

      visiting.add(id);
      for (const dep of module.manifest.dependencies ?? []) {
        visit(dep);
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of this.registered.keys()) {
      visit(id);
    }
    return order;
  }

  private syncStore(): void {
    this.loadedStore.set([...this.loaded.values()]);
  }
}
