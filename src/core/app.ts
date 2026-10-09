import type { App as IApp } from './types';
import { Config } from './config';
import { Commands } from './commands';
import { WorkspaceManager } from './workspace';
import { Navigation } from './navigation';
import { PluginLoader } from './loader';
import { ThemeEngine } from './theme';
import { detectPlatform } from './platform';
import { CapabilityRegistry } from './capabilities';
import type { PluginModule } from './loader';

/** Start-page preference meaning "reopen whatever was open last session". */
export const LAST_SESSION = '__last__';

/**
 * The App is the kernel instance passed to every plugin. It wires together
 * the four core services (config, commands, workspace, loader) plus the
 * platform info and theme engine. It deliberately contains NO feature logic.
 */
export class SojusApp implements IApp {
  readonly config: Config;
  readonly commands: Commands;
  readonly workspace: WorkspaceManager;
  readonly navigation: Navigation;
  readonly plugins: PluginLoader;
  readonly theme: ThemeEngine;
  readonly platform = detectPlatform();
  /** Platform-specific powers (folders, wallpaper…), filled by installCapabilities. */
  readonly capabilities = new CapabilityRegistry();

  constructor() {
    this.config = new Config();
    this.commands = new Commands();
    this.workspace = new WorkspaceManager();
    this.navigation = new Navigation();
    this.theme = new ThemeEngine();
    this.plugins = new PluginLoader(this, this.config);
  }

  /** Boot sequence: load config, register plugins, load the enabled ones. */
  async boot(modules: PluginModule[]): Promise<void> {
    this.config.load();
    this.theme.init();
    this.plugins.registerMany(modules);

    // First run: if config is empty, enable nothing yet — the shell shows
    // an onboarding state. Bundles will seed the config in a later phase.
    await this.plugins.loadEnabled();

    this.registerCoreCommands();
    this.restoreWorkspace();
  }

  /**
   * Remember which tabs were open + which was active, and restore them on the
   * next load. Without this, any reload (dev HMR, app restart) drops the user
   * on the empty onboarding screen instead of back where they were.
   */
  private restoreWorkspace(): void {
    const NS = 'workspace';
    const KEY = 'ui';
    const saved = this.config.get<{ openTabs?: string[]; activeTab?: string | null }>(NS, KEY);

    // Reopen persisted views whose factory is registered for this platform.
    for (const id of saved?.openTabs ?? []) {
      if (this.workspace.hasView(id)) this.workspace.openView(id);
    }

    // Start page: open the home when the session restored no tabs, so the app
    // lands somewhere instead of on an empty screen. Which view is the home is
    // the user's choice (Settings → Allgemein) or, unset, the one a plugin
    // flagged as default. The explicit "Letzte Sitzung" choice opens nothing.
    const startId = this.resolveStartPageId();
    if (this.workspace.tabs.get().length === 0 && startId && this.workspace.hasView(startId)) {
      this.workspace.openView(startId);
    }

    if (saved?.activeTab && this.workspace.hasView(saved.activeTab)) {
      this.workspace.openView(saved.activeTab); // ensures it's open AND active
    }

    // Persist on any later change (subscribe fires once immediately too).
    const persist = () => {
      this.config.set(NS, KEY, {
        openTabs: this.workspace.tabs.get().map((t) => t.id),
        activeTab: this.workspace.activeTabId.get(),
      });
    };
    this.workspace.tabs.subscribe(persist);
    this.workspace.activeTabId.subscribe(persist);
  }

  /** Whether first-run onboarding is done (false shows the bundle picker). */
  isOnboarded(): boolean {
    return this.config.get<boolean>('core', 'onboarded') ?? false;
  }

  /**
   * Finish onboarding: enable the chosen plugins (loads them, registering their
   * views/nav/commands), mark onboarding done, and open the resulting home.
   */
  async completeOnboarding(pluginIds: string[]): Promise<void> {
    for (const id of pluginIds) {
      await this.plugins.setEnabled(id, true);
    }
    this.config.set('core', 'onboarded', true);
    const startId = this.resolveStartPageId();
    if (startId && this.workspace.hasView(startId)) this.workspace.openView(startId);
  }

  /** The view id to open as the home, or null for "Letzte Sitzung" / none. */
  private resolveStartPageId(): string | null {
    const pref = this.config.get<string>('core', 'startPage');
    if (pref === LAST_SESSION) return null;
    if (pref && this.workspace.hasView(pref)) return pref;
    return this.navigation.defaultStartPageId();
  }

  /**
   * The current start-page preference for the settings UI: the stored choice,
   * or — when unset — the plugin-flagged default (falling back to "last
   * session" if no plugin offers one). A value of LAST_SESSION means restore.
   */
  getStartPagePref(): string {
    const stored = this.config.get<string>('core', 'startPage');
    if (stored) return stored;
    return this.navigation.defaultStartPageId() ?? LAST_SESSION;
  }

  /**
   * Set the start page. A concrete view id also opens that view now, so the
   * change is immediately visible rather than only on the next launch.
   */
  setStartPagePref(value: string): void {
    this.config.set('core', 'startPage', value);
    if (value !== LAST_SESSION && this.workspace.hasView(value)) {
      this.workspace.openView(value);
    }
  }

  private registerCoreCommands(): void {
    this.commands.register({
      id: 'core:close-active-tab',
      name: 'Aktuellen Tab schließen',
      shortcut: 'Ctrl+W',
      callback: () => {
        const active = this.workspace.activeTabId.get();
        if (active) this.workspace.closeView(active);
      },
    });
  }
}
