<script lang="ts">
  import type { SojusApp } from '@core/app';
  import { useStore } from './reactive.svelte';
  import { APP_NAME } from './branding';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
    onOpenPlugins: () => void;
    onOpenSettings: () => void;
    openView: (viewId: string) => void;
  }
  let { app, onOpenPlugins, onOpenSettings, openView }: Props = $props();

  const navItems = useStore(app.navigation.store);
  const updates = useStore(app.pluginStore.updatesStore);
</script>

<div class="home">
  <div class="hero">
    <div class="logo">◍</div>
    <h1>{APP_NAME}</h1>
    <p>Dein anpassbares Zuhause – alles ist ein Plugin. Öffne eins, hol dir neue aus dem Store oder richte Orbit nach deinem Geschmack ein.</p>
  </div>

  {#if navItems.value.length > 0}
    <h2>Deine Plugins</h2>
    <div class="grid">
      {#each navItems.value as item (item.id)}
        <button class="tile" onclick={() => openView(item.viewId)}>
          <span class="t-ico"><Icon name={item.icon} size={22} /></span>
          <span class="t-name">{item.name}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="empty">
      <p>Noch keine Plugins aktiv.</p>
    </div>
  {/if}

  <h2>Orbit</h2>
  <div class="grid">
    <button class="tile" onclick={onOpenPlugins}>
      <span class="t-ico"><Icon name="plugin" size={22} />{#if updates.value.length > 0}<span class="dot"></span>{/if}</span>
      <span class="t-name">Plugins{#if updates.value.length > 0} · {updates.value.length} Update{updates.value.length > 1 ? 's' : ''}{/if}</span>
    </button>
    <button class="tile" onclick={onOpenSettings}>
      <span class="t-ico"><Icon name="settings" size={22} /></span>
      <span class="t-name">Einstellungen</span>
    </button>
  </div>
</div>

<style>
  .home {
    max-width: 720px;
    margin: 0 auto;
    padding: clamp(24px, 6vw, 56px) 24px 48px;
  }
  .hero {
    text-align: center;
    margin-bottom: clamp(24px, 5vw, 44px);
  }
  .logo {
    font-size: 3rem;
    line-height: 1;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .hero h1 {
    margin: 0 0 12px;
    font-size: clamp(2rem, 7vw, 2.8rem);
    letter-spacing: -0.02em;
  }
  .hero p {
    margin: 0 auto;
    max-width: 34rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-faint);
    margin: var(--space-5) 0 var(--space-3);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-3);
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: var(--space-4) var(--space-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--text);
    cursor: pointer;
    transition: transform 0.12s, border-color 0.18s, background 0.18s;
  }
  .tile:hover {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
    background: var(--bg-hover);
  }
  .tile:active {
    transform: scale(0.97);
  }
  .t-ico {
    position: relative;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
  }
  .dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--bg-elevated);
  }
  .t-name {
    font-size: 0.88rem;
    font-weight: 600;
    text-align: center;
  }
  .empty {
    color: var(--text-faint);
    padding: var(--space-4) 0;
  }
</style>
