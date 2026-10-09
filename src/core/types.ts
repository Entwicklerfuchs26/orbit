import type { CapabilityRegistry, CapabilityName } from './capabilities';

export type PlatformType = 'desktop' | 'mobile' | 'web';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  type: 'gui' | 'adapter' | 'theme' | 'tool';
  dependencies?: string[];
  /**
   * Platforms this plugin supports. Omitted = all platforms. If set and the
   * current platform isn't listed, the kernel won't load it (shown as
   * "not for this platform" in settings).
   */
  platforms?: PlatformType[];
  /**
   * Capabilities this plugin needs from the core (e.g. 'folders', 'wallpaper').
   * Informational for now — surfaced in the Plugins/store UI so a user sees
   * what a plugin requires and whether this device can provide it
   * (`app.capabilities.has(x)`). The kernel does not block loading on it yet.
   */
  capabilities?: CapabilityName[];
}

export interface PluginConfig {
  enable: boolean;
  [key: string]: unknown;
}

export interface AppConfig {
  plugins: Record<string, PluginConfig>;
}

export interface NavigationItem {
  id: string;
  name: string;
  icon: string;
  priority?: number;
  /** View type to open when the item is clicked. Defaults to item id. */
  viewId?: string;
}

export interface Command {
  id: string;
  name: string;
  shortcut?: string;
  callback: () => void;
}

export interface SettingTab {
  id: string;
  name: string;
  icon?: string;
  render(containerEl: HTMLElement): void;
  hide?(): void;
}

export interface ViewConstructor {
  new (app: App): View;
}

export interface NavigationRegistry {
  register(item: NavigationItem & { pluginId: string; viewId: string }): void;
  unregisterByPlugin(pluginId: string): void;
}

/**
 * The extracted colour roles for the active theme, resolved to the current
 * light/dark mode. Any plugin can read these to tint itself consistently.
 */
export interface PaletteRoles {
  primary: string;
  secondary: string;
  tertiary: string;
  surface: string;
  surfaceVariant: string;
  outline: string;
  onSurface: string;
}

export interface WallpaperInfo {
  /** Image URL (data: or http). null = no wallpaper set. */
  url: string | null;
  /** 0..1 dim overlay applied behind content. */
  dim: number;
  /** Optional animated swap when the wallpaper changes (CSS or WebGL type). */
  transition?: { type: string; ms: number };
  /** Media kind of the wallpaper; 'video' renders a looping <video> layer. */
  kind?: 'image' | 'video';
}

interface ReadableStore<T> {
  get(): T;
  subscribe(fn: (v: T) => void): () => void;
}

export interface ThemeApi {
  mode: ReadableStore<'light' | 'dark' | 'auto'>;
  resolved: ReadableStore<'light' | 'dark'>;
  /** The active colour roles — read these to theme your plugin. */
  palette: ReadableStore<PaletteRoles>;
  /** The active wallpaper — read this to reuse it (e.g. chat background). */
  wallpaper: ReadableStore<WallpaperInfo>;
  setMode(mode: 'light' | 'dark' | 'auto'): void;
  resolvedMode(): 'light' | 'dark';
  setTokens(tokens: Record<string, string>): void;
  /** Publish the active colour roles (theme/wallpaper plugins call this). */
  setPalette(roles: PaletteRoles): void;
  /** Publish the active wallpaper (theme/wallpaper plugins call this). */
  setWallpaper(info: WallpaperInfo): void;
}

export interface App {
  workspace: Workspace;
  config: ConfigManager;
  commands: CommandManager;
  navigation: NavigationRegistry;
  theme: ThemeApi;
  platform: PlatformInfo;
  plugins: PluginRegistry;
  capabilities: CapabilityRegistry;
}

export interface Workspace {
  registerView(id: string, factory: () => View): void;
  openView(id: string): void;
  closeView(id: string): void;
  getActiveView(): View | null;
  setActiveView(id: string): void;
}

export interface ConfigManager {
  get<T>(pluginId: string, key: string): T | undefined;
  set(pluginId: string, key: string, value: unknown): void;
  getPluginConfig(pluginId: string): PluginConfig | undefined;
  getAll(): AppConfig;
  save(): void;
  load(): void;
}

export interface CommandManager {
  register(command: Command): void;
  unregister(id: string): void;
  execute(id: string): void;
  getAll(): Command[];
  search(query: string): Command[];
}

export interface PlatformInfo {
  type: 'desktop' | 'mobile' | 'web';
  os: 'linux' | 'macos' | 'windows' | 'android' | 'ios' | 'unknown';
  isMobile: boolean;
  isDesktop: boolean;
}

export interface PluginRegistry {
  get(id: string): Plugin | undefined;
  getAll(): Plugin[];
  isEnabled(id: string): boolean;
}

export abstract class View {
  app: App;
  containerEl!: HTMLElement;

  constructor(app: App) {
    this.app = app;
  }

  abstract getViewType(): string;
  abstract getDisplayName(): string;
  abstract getIcon(): string;

  abstract onOpen(): Promise<void>;
  abstract onClose(): Promise<void>;
}

export abstract class Plugin {
  app: App;
  manifest: PluginManifest;

  private _navItems: NavigationItem[] = [];
  private _commands: Command[] = [];
  private _settingTabs: SettingTab[] = [];
  private _views: Map<string, () => View> = new Map();

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  abstract onload(): Promise<void>;
  abstract onunload(): Promise<void>;

  addNavigationItem(item: NavigationItem): void {
    this._navItems.push(item);
    this.app.navigation.register({
      ...item,
      pluginId: this.manifest.id,
      viewId: item.viewId ?? item.id,
    });
  }

  addCommand(command: Command): void {
    const prefixed = { ...command, id: `${this.manifest.id}:${command.id}` };
    this._commands.push(prefixed);
    this.app.commands.register(prefixed);
  }

  addSettingTab(tab: SettingTab): void {
    this._settingTabs.push(tab);
  }

  registerView(id: string, factory: () => View): void {
    this._views.set(id, factory);
    this.app.workspace.registerView(id, factory);
  }

  getNavigationItems(): NavigationItem[] {
    return this._navItems;
  }

  getSettingTabs(): SettingTab[] {
    return this._settingTabs;
  }

  cleanup(): void {
    for (const cmd of this._commands) {
      this.app.commands.unregister(cmd.id);
    }
    this.app.navigation.unregisterByPlugin(this.manifest.id);
    this._navItems = [];
    this._commands = [];
    this._settingTabs = [];
    this._views.clear();
  }
}
