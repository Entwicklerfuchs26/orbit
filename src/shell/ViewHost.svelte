<script lang="ts">
  import type { SojusApp } from '@core/app';
  import type { View } from '@core/types';
  import { useStore } from './reactive.svelte';
  import { APP_NAME } from './branding';

  interface Props {
    app: SojusApp;
  }
  let { app }: Props = $props();

  const activeTab = useStore(app.workspace.activeTabId);
  const tabsList = useStore(app.workspace.tabs);

  let host: HTMLElement;
  // Persist each view's DOM container so switching tabs keeps state.
  const containers = new Map<string, HTMLElement>();
  const opened = new Set<string>();

  $effect(() => {
    const activeId = activeTab.value;
    const liveTabs = new Set(tabsList.value.map((t) => t.id));

    // Clean up containers for closed tabs FIRST — must run even when no tab is
    // active, otherwise a stale (unmounted) container lingers and gets reused
    // empty when the view is reopened.
    for (const [id, el] of containers) {
      if (!liveTabs.has(id)) {
        el.remove();
        containers.delete(id);
        opened.delete(id);
      }
    }

    // Hide all, show active.
    for (const [id, el] of containers) {
      el.style.display = id === activeId ? 'block' : 'none';
    }

    if (!activeId) return;

    // Lazily create + open the view container on first activation.
    if (!containers.has(activeId)) {
      const view = app.workspace.getView(activeId);
      if (!view) return;
      const el = document.createElement('div');
      el.className = 'view-container';
      view.containerEl = el;
      host.appendChild(el);
      containers.set(activeId, el);
      el.style.display = 'block';
      if (!opened.has(activeId)) {
        opened.add(activeId);
        void view.onOpen();
      }
    }
  });
</script>

<div class="view-host" bind:this={host}>
  {#if !activeTab.value}
    <div class="welcome">
      <div class="welcome-card">
        <h1>{APP_NAME}</h1>
        <p>Dein KI-Betriebssystem. Der Kern läuft — jetzt fehlen nur noch Plugins.</p>
        <p class="hint">Öffne die <strong>Einstellungen</strong> (unten links) und aktiviere ein Plugin, oder drücke <kbd>Ctrl</kbd>+<kbd>P</kbd> für die Kommandopalette.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .view-host {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: var(--view-bg, var(--bg-elevated));
  }
  :global(.view-container) {
    height: 100%;
    overflow: auto;
  }
  .welcome {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-5);
  }
  .welcome-card {
    max-width: 440px;
    text-align: center;
  }
  .welcome-card h1 {
    color: var(--accent);
    font-size: 2.4rem;
    margin: 0 0 var(--space-3);
  }
  .welcome-card p {
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0 0 var(--space-3);
  }
  .welcome-card .hint {
    font-size: 0.9rem;
    color: var(--text-faint);
  }
  kbd {
    background: var(--bg-active);
    padding: 1px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
</style>
