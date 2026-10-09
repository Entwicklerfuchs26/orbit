<script lang="ts">
  import type { SojusApp } from '@core/app';
  import type { Bundle } from '@core/index';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
    bundles: Bundle[];
    onDone: () => void;
  }
  let { app, bundles, onDone }: Props = $props();

  const CUSTOM = '__custom__';
  const NONE = '__none__';

  // Plugins the user can pick in "Eigenes" — everything registered that runs on
  // this platform.
  const pickable = app.plugins
    .getRegistered()
    .filter((m) => app.plugins.supportsPlatform(m.id));

  // Preselect the recommended bundle (or the first one).
  let selected = $state<string>(bundles.find((b) => b.recommended)?.id ?? bundles[0]?.id ?? CUSTOM);
  let custom = $state<Record<string, boolean>>(
    Object.fromEntries(pickable.map((m) => [m.id, m.id === 'skwd-wall'])),
  );
  let busy = $state(false);

  let chosenIds = $derived(
    selected === NONE
      ? []
      : selected === CUSTOM
        ? pickable.filter((m) => custom[m.id]).map((m) => m.id)
        : (bundles.find((b) => b.id === selected)?.plugins ?? []),
  );

  // "Leer starten" is a valid choice (install nothing); every other option needs
  // at least one plugin selected.
  let canStart = $derived(selected === NONE || chosenIds.length > 0);

  async function start() {
    if (busy || !canStart) return;
    busy = true;
    await app.completeOnboarding(chosenIds);
    onDone();
  }
</script>

<div class="onb-overlay">
  <div class="onb-card" role="dialog" aria-modal="true" aria-label="Erste Einrichtung">
    <header>
      <h1>Willkommen bei <span class="accent">Orbit</span></h1>
      <p>Orbit ist ein Baukasten — alles ist ein Plugin. Wähle, womit du starten willst. Alles lässt sich später in den Einstellungen ändern.</p>
    </header>

    <div class="options">
      {#each bundles as b (b.id)}
        <button class="opt" class:sel={selected === b.id} onclick={() => (selected = b.id)}>
          <div class="opt-head">
            <span class="opt-name">{b.name}</span>
            {#if b.recommended}<span class="badge">Empfohlen</span>{/if}
          </div>
          <span class="opt-desc">{b.description}</span>
        </button>
      {/each}

      <button class="opt" class:sel={selected === CUSTOM} onclick={() => (selected = CUSTOM)}>
        <div class="opt-head"><span class="opt-name">Eigenes</span></div>
        <span class="opt-desc">Plugins einzeln auswählen.</span>
      </button>

      <button class="opt" class:sel={selected === NONE} onclick={() => (selected = NONE)}>
        <div class="opt-head"><span class="opt-name">Leer starten</span></div>
        <span class="opt-desc">Keine Plugins installieren — alles später selbst im Plugins-Bereich hinzufügen.</span>
      </button>

      {#if selected === CUSTOM}
        <div class="custom-list">
          {#each pickable as m (m.id)}
            <label class="custom-row">
              <input type="checkbox" bind:checked={custom[m.id]} />
              <span class="cr-name">{m.name}</span>
              <span class="cr-type">{m.type}</span>
              <span class="cr-desc">{m.description}</span>
            </label>
          {/each}
        </div>
      {/if}
    </div>

    <footer>
      <button class="go" onclick={start} disabled={busy || !canStart}>
        <Icon name="check" size={16} /> Los geht's
      </button>
    </footer>
  </div>
</div>

<style>
  .onb-overlay {
    position: fixed;
    inset: 0;
    z-index: 950;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    overflow-y: auto;
  }
  .onb-card {
    width: min(560px, 100%);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: 100%;
  }
  header h1 {
    margin: 0 0 var(--space-2);
    font-size: 1.5rem;
  }
  .accent {
    color: var(--accent);
  }
  header p {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    overflow-y: auto;
  }
  .opt {
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);
  }
  .opt:hover {
    background: var(--bg-hover);
  }
  .opt.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .opt-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .opt-name {
    font-weight: 600;
  }
  .badge {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .opt-desc {
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .custom-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
  }
  .custom-row {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: baseline;
    gap: 2px var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .custom-row:hover {
    background: var(--bg-hover);
  }
  .custom-row input {
    grid-row: 1 / 3;
    align-self: center;
  }
  .cr-name {
    font-weight: 600;
  }
  .cr-type {
    font-size: 0.68rem;
    text-transform: uppercase;
    color: var(--text-faint);
    background: var(--bg-active);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .cr-desc {
    grid-column: 2 / -1;
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  footer {
    display: flex;
    justify-content: flex-end;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--accent);
    color: var(--accent-text);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-5);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
  }
  .go:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
