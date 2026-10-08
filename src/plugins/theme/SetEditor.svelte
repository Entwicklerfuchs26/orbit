<script lang="ts">
  import type { App } from '@core/index';
  import { useStore } from '@shell/reactive.svelte';
  import type { ThemeManager } from './manager';
  import type { ThemeSet } from './types';
  import { FONTS } from './types';
  import { seedFromImage } from './palette';

  interface Props {
    app: App;
    manager: ThemeManager;
  }
  let { app, manager }: Props = $props();

  const themeState = useStore(manager.state);

  // Local editable draft, seeded from the active set.
  let draft = $state<ThemeSet>(cloneActive());
  let dirty = $state(false);
  let extracting = $state(false);

  function cloneActive(): ThemeSet {
    const a = manager.getActive();
    return a ? structuredClone($state.snapshot(a) as ThemeSet) : manager.newSet();
  }

  // Live preview whenever the draft changes.
  $effect(() => {
    const snap = $state.snapshot(draft) as ThemeSet;
    manager.preview(snap);
  });

  function loadSet(id: string) {
    manager.selectSet(id);
    draft = cloneActive();
    dirty = false;
  }

  function markDirty() {
    dirty = true;
  }

  function save() {
    manager.upsertSet($state.snapshot(draft) as ThemeSet);
    dirty = false;
  }

  function newSet() {
    draft = manager.newSet();
    dirty = true;
  }

  function duplicate() {
    const copy = manager.duplicateSet(draft.id);
    if (copy) {
      draft = structuredClone($state.snapshot(copy) as ThemeSet);
      dirty = false;
    }
  }

  function remove() {
    const id = draft.id;
    manager.deleteSet(id);
    draft = cloneActive();
    dirty = false;
  }

  function onWallpaper(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      draft.wallpaperDesktop = url;
      draft.wallpaperMobile = url;
      markDirty();
    };
    reader.readAsDataURL(file);
  }

  function clearWallpaper() {
    draft.wallpaperDesktop = undefined;
    draft.wallpaperMobile = undefined;
    markDirty();
  }

  async function paletteFromWallpaper() {
    const src = draft.wallpaperDesktop ?? draft.wallpaperMobile;
    if (!src) return;
    extracting = true;
    const seed = await seedFromImage(src);
    extracting = false;
    if (seed) {
      draft.accent = seed;
      markDirty();
    }
  }

  let isActive = $derived(themeState.value.activeSetId === draft.id);
  let hasWallpaper = $derived(!!(draft.wallpaperDesktop ?? draft.wallpaperMobile));
</script>

<div class="editor">
  <header>
    <h1>Design</h1>
    <p>Ein Set bündelt Farbe, Hell/Dunkel, Wallpaper, Schrift, Dichte und Animationen. Änderungen siehst du sofort live.</p>
  </header>

  <section class="sets">
    <div class="sets-head">
      <h2>Sets</h2>
      <button class="ghost" onclick={newSet}>+ Neu</button>
    </div>
    <div class="set-grid">
      {#each themeState.value.sets as s (s.id)}
        <button
          class="set-card"
          class:selected={s.id === draft.id}
          onclick={() => loadSet(s.id)}
          style="--sw:{s.accent}"
        >
          <span class="swatch"></span>
          <span class="set-name">{s.name}</span>
          <span class="set-meta">{s.mode}{s.builtin ? ' · fix' : ''}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="form">
    <div class="field">
      <label for="name">Name</label>
      <input id="name" type="text" bind:value={draft.name} oninput={markDirty} />
    </div>

    <div class="field">
      <label for="accent">Akzentfarbe</label>
      <div class="accent-row">
        <input id="accent" type="color" bind:value={draft.accent} oninput={markDirty} />
        <input class="hex" type="text" bind:value={draft.accent} oninput={markDirty} spellcheck="false" />
      </div>
    </div>

    <div class="field">
      <span class="lbl">Modus</span>
      <div class="segmented">
        {#each ['auto', 'light', 'dark'] as m}
          <button class:active={draft.mode === m} onclick={() => { draft.mode = m as any; markDirty(); }}>
            {m === 'auto' ? 'Auto' : m === 'light' ? 'Hell' : 'Dunkel'}
          </button>
        {/each}
      </div>
    </div>

    <div class="field">
      <label for="font">Schrift</label>
      <select id="font" bind:value={draft.font} onchange={markDirty}>
        {#each FONTS as f}
          <option value={f.value}>{f.label}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="radius">Ecken-Rundung · {draft.radius}px</label>
      <input id="radius" type="range" min="0" max="24" bind:value={draft.radius} oninput={markDirty} />
    </div>

    <div class="field">
      <span class="lbl">Dichte</span>
      <div class="segmented">
        {#each [['comfortable','Komfortabel'],['compact','Kompakt']] as [v,l]}
          <button class:active={draft.density === v} onclick={() => { draft.density = v as any; markDirty(); }}>{l}</button>
        {/each}
      </div>
    </div>

    <div class="field">
      <span class="lbl">Animationen</span>
      <div class="segmented">
        {#each [['on','An'],['reduced','Reduziert'],['off','Aus']] as [v,l]}
          <button class:active={draft.animations === v} onclick={() => { draft.animations = v as any; markDirty(); }}>{l}</button>
        {/each}
      </div>
    </div>

    <div class="field">
      <span class="lbl">Wallpaper</span>
      <div class="wp-controls">
        <label class="file-btn">
          {hasWallpaper ? 'Ändern' : 'Hochladen'}
          <input type="file" accept="image/*" onchange={onWallpaper} hidden />
        </label>
        {#if hasWallpaper}
          <button class="ghost" onclick={paletteFromWallpaper} disabled={extracting}>
            {extracting ? 'Lese Farben…' : 'Palette aus Wallpaper'}
          </button>
          <button class="ghost danger" onclick={clearWallpaper}>Entfernen</button>
        {/if}
      </div>
      {#if hasWallpaper}
        <label for="dim" class="dim-lbl">Abdunkeln · {Math.round(draft.wallpaperDim * 100)}%</label>
        <input id="dim" type="range" min="0" max="0.85" step="0.05" bind:value={draft.wallpaperDim} oninput={markDirty} />
      {/if}
    </div>
  </section>

  <footer>
    <button class="primary" onclick={save} disabled={!dirty}>
      {draft.id && themeState.value.sets.some((s) => s.id === draft.id) ? 'Speichern' : 'Erstellen'}
    </button>
    <button class="ghost" onclick={duplicate}>Duplizieren</button>
    {#if !draft.builtin && themeState.value.sets.some((s) => s.id === draft.id)}
      <button class="ghost danger" onclick={remove}>Löschen</button>
    {/if}
    {#if !isActive}
      <span class="hint">Nicht aktiv — speichern aktiviert dieses Set.</span>
    {/if}
  </footer>
</div>

<style>
  .editor {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-6);
  }
  header h1 {
    margin: 0 0 var(--space-2);
    color: var(--accent);
  }
  header p {
    margin: 0 0 var(--space-5);
    color: var(--text-muted);
    line-height: 1.5;
  }
  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-faint);
    margin: 0;
  }
  .sets-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }
  .set-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-2);
    margin-bottom: var(--space-5);
  }
  .set-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: var(--space-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    text-align: left;
    transition: border-color var(--transition), transform var(--transition);
  }
  .set-card:hover {
    transform: translateY(-1px);
  }
  .set-card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .swatch {
    width: 100%;
    height: 22px;
    border-radius: var(--radius-sm);
    background: var(--sw);
  }
  .set-name {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .set-meta {
    font-size: 0.72rem;
    color: var(--text-faint);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .field label,
  .field .lbl {
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  input[type='text'],
  select {
    padding: var(--space-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 0.95rem;
    width: 100%;
  }
  .accent-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  input[type='color'] {
    width: 52px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
  }
  .hex {
    flex: 1;
    font-family: var(--font-mono);
    text-transform: uppercase;
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
  .segmented {
    display: flex;
    flex-wrap: wrap;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    width: fit-content;
    max-width: 100%;
  }
  .segmented button {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .segmented button.active {
    background: var(--accent);
    color: var(--accent-text);
  }
  .wp-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .file-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--bg-active);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 0.85rem;
    cursor: pointer;
  }
  .dim-lbl {
    margin-top: var(--space-2);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border);
  }
  button.primary {
    padding: var(--space-3) var(--space-5);
    background: var(--accent);
    color: var(--accent-text);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.9rem;
  }
  button.primary:disabled {
    opacity: 0.45;
  }
  button.ghost {
    padding: var(--space-3) var(--space-4);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 0.9rem;
  }
  button.ghost:hover {
    background: var(--bg-hover);
  }
  button.danger {
    color: #e5484d;
    border-color: #e5484d55;
  }
  .hint {
    font-size: 0.82rem;
    color: var(--text-faint);
  }
</style>
