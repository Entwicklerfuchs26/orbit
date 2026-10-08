import type { AppConfig, ConfigManager, PluginConfig } from './types';
import { Store } from './store';

const CONFIG_KEY = 'sojus-config';

const DEFAULT_CONFIG: AppConfig = {
  plugins: {},
};

export class Config implements ConfigManager {
  private data: AppConfig;
  readonly store: Store<AppConfig>;

  constructor() {
    this.data = DEFAULT_CONFIG;
    this.store = new Store(this.data);
  }

  load(): void {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        this.data = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        this.store.set(this.data);
      }
    } catch {
      this.data = DEFAULT_CONFIG;
    }
  }

  save(): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.data, null, 2));
    this.store.set(this.data);
  }

  getAll(): AppConfig {
    return this.data;
  }

  getPluginConfig(pluginId: string): PluginConfig | undefined {
    return this.data.plugins[pluginId];
  }

  get<T>(pluginId: string, key: string): T | undefined {
    const pluginConf = this.data.plugins[pluginId];
    if (!pluginConf) return undefined;
    return pluginConf[key] as T | undefined;
  }

  set(pluginId: string, key: string, value: unknown): void {
    if (!this.data.plugins[pluginId]) {
      this.data.plugins[pluginId] = { enable: true };
    }
    this.data.plugins[pluginId][key] = value;
    this.save();
  }

  enablePlugin(pluginId: string, config?: Partial<PluginConfig>): void {
    this.data.plugins[pluginId] = {
      ...this.data.plugins[pluginId],
      enable: true,
      ...config,
    };
    this.save();
  }

  disablePlugin(pluginId: string): void {
    if (this.data.plugins[pluginId]) {
      this.data.plugins[pluginId].enable = false;
      this.save();
    }
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.data.plugins[pluginId]?.enable ?? false;
  }
}
