import type { App as IApp } from './types';
import { Config } from './config';
import { Commands } from './commands';
import { WorkspaceManager } from './workspace';
import { Navigation } from './navigation';
import { PluginLoader } from './loader';
import { ThemeEngine } from './theme';
import { detectPlatform } from './platform';
import type { PluginModule } from './loader';

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
