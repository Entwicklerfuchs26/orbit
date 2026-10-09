<script lang="ts">
  import type { SojusApp } from '@core/app';
  import { useStore } from './reactive.svelte';
  import Sidebar from './Sidebar.svelte';
  import Tabs from './Tabs.svelte';
  import ViewHost from './ViewHost.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import Settings from './Settings.svelte';
  import Plugins from './Plugins.svelte';
  import Onboarding from './Onboarding.svelte';
  import { HomeView } from './home';
  import type { Bundle } from '@core/index';
  import { onMount } from 'svelte';

  interface Props {
    app: SojusApp;
    bundles?: Bundle[];
  }
  let { app, bundles = [] }: Props = $props();

  // First run shows the bundle picker; it enables plugins, then this hides.
  let showOnboarding = $state(!app.isOnboarded());

  // Register the Orbit home view so the wordmark can switch back to it, and make
  // it the universal base: whenever no view is active (first run, or the last
  // plugin was closed), open Home instead of the bare empty state.
  onMount(() => {
    app.workspace.registerView(
      HomeView.ID,
      () =>
        new HomeView(app, {
          onOpenPlugins: () => (pluginsOpen = true),
          onOpenSettings: () => (settingsOpen = true),
          openView: (viewId) => app.workspace.openView(viewId),
        }),
    );
    const ensureHome = () => {
      if (!app.workspace.activeTabId.get()) app.workspace.openView(HomeView.ID);
    };
    app.workspace.activeTabId.subscribe(ensureHome);
  });
  function goHome() {
    app.workspace.openView(HomeView.ID);
  }

  let collapsed = $state(app.platform.isMobile);
  let paletteOpen = $state(false);
  let settingsOpen = $state(false);
  let pluginsOpen = $state(false);
  let mobileNavOpen = $state(false);

  const activeTab = useStore(app.workspace.activeTabId);

  function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      paletteOpen = !paletteOpen;
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      const active = app.workspace.activeTabId.get();
      if (active) app.workspace.closeView(active);
    } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      settingsOpen = true;
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="shell" class:mobile={app.platform.isMobile}>
  {#if app.platform.isMobile}
    <!-- Mobile: sidebar is a drawer overlay -->
    {#if mobileNavOpen}
      <div class="drawer-backdrop" onclick={() => (mobileNavOpen = false)} role="presentation"></div>
      <div class="drawer">
        <Sidebar
          {app}
          collapsed={false}
          onToggleCollapse={() => (mobileNavOpen = false)}
          onOpenSettings={() => {
            settingsOpen = true;
            mobileNavOpen = false;
          }}
          onOpenPlugins={() => {
            pluginsOpen = true;
            mobileNavOpen = false;
          }}
          onGoHome={() => {
            goHome();
            mobileNavOpen = false;
          }}
          onOpenCommandPalette={() => {
            paletteOpen = true;
            mobileNavOpen = false;
          }}
        />
      </div>
    {/if}
  {:else}
    <Sidebar
      {app}
      {collapsed}
      onToggleCollapse={() => (collapsed = !collapsed)}
      onOpenSettings={() => (settingsOpen = true)}
      onOpenPlugins={() => (pluginsOpen = true)}
      onGoHome={goHome}
      onOpenCommandPalette={() => (paletteOpen = true)}
    />
  {/if}

  <main class="main">
    {#if app.platform.isMobile}
      <div class="mobile-bar">
        <button class="mobile-menu" onclick={() => (mobileNavOpen = true)} aria-label="Menü">☰</button>
      </div>
    {/if}
    <Tabs {app} />
    <ViewHost {app} />
  </main>
</div>

<CommandPalette {app} open={paletteOpen} onClose={() => (paletteOpen = false)} />
<Settings {app} open={settingsOpen} onClose={() => (settingsOpen = false)} />
<Plugins {app} open={pluginsOpen} onClose={() => (pluginsOpen = false)} />

{#if showOnboarding}
  <Onboarding {app} {bundles} onDone={() => (showOnboarding = false)} />
{/if}

<style>
  .shell {
    display: flex;
    height: 100%;
    width: 100%;
  }
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .mobile-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    padding-top: max(var(--space-3), env(safe-area-inset-top));
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }
  .mobile-menu {
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 1.4rem;
    line-height: 1;
  }
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 800;
  }
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 801;
    box-shadow: var(--shadow);
    background: var(--bg-elevated);
    /* Respect the status bar (top) and gesture/home bar (bottom) so the menu
       header isn't under the clock and "Einstellungen" isn't under the home bar. */
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>
