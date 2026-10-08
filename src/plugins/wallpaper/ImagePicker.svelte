<script lang="ts">
  import { useStore } from '@shell/reactive.svelte';
  import type { WallpaperManager } from './manager';
  import { COLOR_FAMILIES } from './types';
  import { colorFamily } from './color';

  interface Props {
    manager: WallpaperManager;
    title?: string;
    onpick: (id: string) => void;
    onclose: () => void;
  }
  let { manager, title = 'Bild wählen', onpick, onclose }: Props = $props();

  const wpState = useStore(manager.state);
  const urls = useStore(manager.urls);

  let search = $state('');
  let favOnly = $state(false);
  let colorKey = $state<string | null>(null);
  let selectedTags = $state<string[]>([]);

  let allItems = $derived(wpState.value.items);
  let allTags = $derived.by(() => {
    const set = new Set<string>();
    for (const it of allItems) for (const t of it.tags ?? []) set.add(t);
    return [...set].sort();
  });
  function toggleTag(t: string) {
    selectedTags = selectedTags.includes(t) ? selectedTags.filter((x) => x !== t) : [...selectedTags, t];
  }

  let items = $derived.by(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((it) => {
      if (favOnly && !it.favorite) return false;
      if (colorKey && colorFamily(it.accent) !== colorKey) return false;
      if (selectedTags.length && !selectedTags.every((t) => (it.tags ?? []).includes(t))) return false;
      if (q && !it.name.toLowerCase().includes(q) && !(it.tags ?? []).some((t) => t.includes(q))) return false;
      return true;
    });
  });

  function bg(id: string): string {
    const u = urls.value[id];
    return u ? `background-image:url(${u})` : '';
  }
</script>

<div class="ip-overlay" onclick={onclose} role="presentation">
  <div class="ip-sheet" onclick={(e) => e.stopPropagation()} role="dialog" aria-label={title} tabindex="-1">
    <div class="ip-head">
      <span>{title}</span>
      <button class="ip-close" onclick={onclose} aria-label="Schließen">×</button>
    </div>

    <input class="ip-search" placeholder="Name oder Tag…" bind:value={search} spellcheck="false" />
    <div class="ip-filters">
      <button class="ip-chip" class:on={favOnly} onclick={() => (favOnly = !favOnly)}>★ Favoriten</button>
      {#each COLOR_FAMILIES as c (c.key)}
        <button class="ip-swatch" class:on={colorKey === c.key} style="--sw:{c.swatch}"
          onclick={() => (colorKey = colorKey === c.key ? null : c.key)} title={c.label} aria-label={c.label}></button>
      {/each}
    </div>
    {#if allTags.length}
      <div class="ip-tags">
        {#each allTags as t (t)}
          <button class="ip-chip sm" class:on={selectedTags.includes(t)} onclick={() => toggleTag(t)}>{t}</button>
        {/each}
      </div>
    {/if}

    {#if items.length === 0}
      <div class="ip-empty">Kein Bild passt zu den Filtern.</div>
    {:else}
      <div class="ip-grid">
        {#each items as it (it.id)}
          <button class="ip-tile" style={bg(it.id)} title={it.name} onclick={() => onpick(it.id)}>
            <span class="ip-name">{it.name}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .ip-overlay {
    position: fixed; inset: 0; z-index: 80; background: rgba(0, 0, 0, 0.55);
    display: flex; align-items: center; justify-content: center; padding: var(--space-4);
  }
  .ip-sheet {
    width: min(560px, 96%); max-height: 88%; overflow-y: auto;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);
  }
  .ip-head { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
  .ip-close { background: transparent; border: none; color: var(--text-muted); font-size: 1.3rem; line-height: 1; }
  .ip-search { padding: var(--space-3); background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.95rem; outline: none; }
  .ip-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .ip-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ip-chip { padding: 5px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 999px; color: var(--text-muted); font-size: 0.82rem; white-space: nowrap; }
  .ip-chip.sm { padding: 4px 10px; font-size: 0.78rem; }
  .ip-chip.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .ip-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; background: var(--sw); padding: 0; }
  .ip-swatch.on { border-color: var(--text); box-shadow: 0 0 0 2px var(--color-primary); }
  .ip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
  .ip-tile {
    position: relative; aspect-ratio: 3 / 4; border: 1px solid var(--border); border-radius: var(--radius-md);
    background-size: cover; background-position: center; background-color: var(--color-surface-variant);
    overflow: hidden; padding: 0; cursor: pointer;
  }
  .ip-name {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 6px 5px; font-size: 0.68rem; color: #fff;
    text-align: left; background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ip-empty { padding: var(--space-5); text-align: center; color: var(--text-muted); font-size: 0.9rem; }
</style>
