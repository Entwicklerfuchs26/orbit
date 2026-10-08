<script lang="ts">
  import type { SojusApp } from '@core/app';
  import { useStore } from './reactive.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
  }
  let { app }: Props = $props();

  const tabs = useStore(app.workspace.tabs);
  const activeTab = useStore(app.workspace.activeTabId);
</script>

{#if tabs.value.length > 0}
  <div class="tabs">
    {#each tabs.value as tab (tab.id)}
      <div class="tab" class:active={activeTab.value === tab.id}>
        <button class="tab-main" onclick={() => app.workspace.setActiveView(tab.id)}>
          <Icon name={tab.icon} size={15} />
          <span>{tab.title}</span>
        </button>
        <button class="tab-close" onclick={() => app.workspace.closeView(tab.id)} title="Schließen">
          <Icon name="close" size={13} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .tabs {
    display: flex;
    gap: 2px;
    padding: var(--space-2) var(--space-2) 0;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  .tab {
    display: flex;
    align-items: center;
    background: transparent;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transition: background var(--transition);
  }
  .tab:hover {
    background: var(--bg-hover);
  }
  .tab.active {
    background: var(--bg-elevated);
  }
  .tab-main {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .tab.active .tab-main {
    color: var(--text);
  }
  .tab-close {
    background: transparent;
    border: none;
    color: var(--text-faint);
    padding: var(--space-1);
    margin-right: var(--space-1);
    border-radius: var(--radius-sm);
    display: flex;
  }
  .tab-close:hover {
    background: var(--bg-active);
    color: var(--text);
  }
</style>
