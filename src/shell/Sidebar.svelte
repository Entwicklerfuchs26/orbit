<script lang="ts">
  import type { SojusApp } from '@core/app';
  import { useStore } from './reactive.svelte';
  import Icon from './Icon.svelte';
  import { APP_NAME, SHOW_WORDMARK } from './branding';

  interface Props {
    app: SojusApp;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onOpenSettings: () => void;
    onOpenPlugins: () => void;
    onOpenCommandPalette: () => void;
  }
  let { app, collapsed, onToggleCollapse, onOpenSettings, onOpenPlugins, onOpenCommandPalette }: Props =
    $props();

  const navItems = useStore(app.navigation.store);
  const activeTab = useStore(app.workspace.activeTabId);

  function open(viewId: string) {
    app.workspace.openView(viewId);
  }
</script>

<nav class="sidebar" class:collapsed>
  <div class="top">
    <button class="icon-btn brand" onclick={onToggleCollapse} title="Menü">
      <Icon name="menu" size={22} />
      {#if !collapsed && SHOW_WORDMARK}<span class="brand-text">{APP_NAME}</span>{/if}
    </button>
  </div>

  <button class="search-btn" onclick={onOpenCommandPalette} title="Befehle (Ctrl+P)">
    <Icon name="search" size={18} />
    {#if !collapsed}<span>Suchen…</span><kbd>⌘P</kbd>{/if}
  </button>

  <div class="items">
    {#each navItems.value as item (item.id)}
      <button
        class="nav-item"
        class:active={activeTab.value === item.viewId}
        onclick={() => open(item.viewId)}
        title={item.name}
      >
        <Icon name={item.icon} size={20} />
        {#if !collapsed}<span>{item.name}</span>{/if}
      </button>
    {/each}

    {#if navItems.value.length === 0 && !collapsed}
      <p class="empty">Keine Plugins aktiv.<br />Öffne Einstellungen, um welche zu aktivieren.</p>
    {/if}
  </div>

  <div class="bottom">
    <button class="nav-item" onclick={onOpenPlugins} title="Plugins">
      <Icon name="plugin" size={20} />
      {#if !collapsed}<span>Plugins</span>{/if}
    </button>
    <button class="nav-item" onclick={onOpenSettings} title="Einstellungen">
      <Icon name="settings" size={20} />
      {#if !collapsed}<span>Einstellungen</span>{/if}
    </button>
  </div>
</nav>

<style>
  .sidebar {
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: 100%;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: var(--space-2);
    gap: var(--space-1);
    transition: width var(--transition), min-width var(--transition);
  }
  .sidebar.collapsed {
    width: var(--sidebar-width-collapsed);
    min-width: var(--sidebar-width-collapsed);
  }
  .top {
    margin-bottom: var(--space-2);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text);
    width: 100%;
  }
  .brand-text {
    color: var(--accent);
  }
  .search-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: var(--space-3);
    transition: background var(--transition);
  }
  .search-btn:hover {
    background: var(--bg-hover);
  }
  .search-btn kbd {
    margin-left: auto;
    font-size: 0.7rem;
    background: var(--bg-active);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: var(--font-mono);
  }
  .items {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-size: 0.92rem;
    text-align: left;
    width: 100%;
    transition: background var(--transition), color var(--transition);
  }
  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--text);
  }
  .nav-item.active {
    background: var(--bg-active);
    color: var(--text);
  }
  .empty {
    color: var(--text-faint);
    font-size: 0.82rem;
    padding: var(--space-3);
    line-height: 1.5;
  }
  .icon-btn {
    background: transparent;
    border: none;
    color: var(--text);
    padding: var(--space-2);
    border-radius: var(--radius-md);
  }
  .bottom {
    border-top: 1px solid var(--border);
    padding-top: var(--space-2);
  }
</style>
