<script lang="ts">
  import type { SojusApp } from '@core/app';
  import { LAST_SESSION } from '@core/app';
  import { useStore } from './reactive.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
    open: boolean;
    onClose: () => void;
  }
  let { app, open, onClose }: Props = $props();

  const themeMode = useStore(app.theme.mode);
  const navItems = useStore(app.navigation.store);

  // Start-page choice: "Letzte Sitzung" or any registered view.
  let startPage = $state(app.getStartPagePref());
  let startCandidates = $derived(navItems.value.map((i) => ({ id: i.viewId, name: i.name })));
  function setStartPage(v: string) {
    startPage = v;
    app.setStartPagePref(v);
  }

  function setMode(mode: 'light' | 'dark' | 'auto') {
    app.theme.setMode(mode);
  }

  let multitask = $state(app.isMultitask());
  function setMultitask(v: boolean) {
    multitask = v;
    app.setMultitask(v);
  }
</script>

{#if open}
  <div class="overlay" onclick={onClose} role="presentation">
    <div class="panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <header>
        <h2>Einstellungen</h2>
        <button class="close" onclick={onClose}><Icon name="close" size={18} /></button>
      </header>

      <div class="content">
        <section>
          <h3>Erscheinungsbild</h3>
          <div class="row">
            <span>Design-Modus</span>
            <div class="segmented">
              {#each ['auto', 'light', 'dark'] as m}
                <button class:active={themeMode.value === m} onclick={() => setMode(m as any)}>
                  {m === 'auto' ? 'Auto' : m === 'light' ? 'Hell' : 'Dunkel'}
                </button>
              {/each}
            </div>
          </div>
        </section>
        <section>
          <h3>Start</h3>
          <div class="row">
            <span>Startseite</span>
            <select class="select" value={startPage} onchange={(e) => setStartPage(e.currentTarget.value)}>
              <option value={LAST_SESSION}>Letzte Sitzung</option>
              {#each startCandidates as c (c.id)}
                <option value={c.id}>{c.name}</option>
              {/each}
            </select>
          </div>
          <p class="hint">Was beim Öffnen der App erscheint. „Letzte Sitzung" stellt die zuletzt offenen Tabs wieder her.</p>
        </section>
        <section>
          <h3>Fenster</h3>
          <div class="row">
            <span>Multitasking-Tabs</span>
            <label class="switch">
              <input type="checkbox" checked={multitask} onchange={(e) => setMultitask(e.currentTarget.checked)} />
              <span class="slider"></span>
            </label>
          </div>
          <p class="hint">An: mehrere Plugins gleichzeitig als Tabs offen halten und umschalten. Aus (Standard): immer nur eine Ansicht – ein neues Plugin ersetzt das offene.</p>
        </section>
        <p class="foot">Plugins verwaltest du im eigenen Bereich <strong>Plugins</strong> in der Seitenleiste.</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 900;
    padding: var(--space-4);
  }
  .panel {
    width: min(620px, 95vw);
    height: min(560px, 90vh);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border);
  }
  header h2 {
    margin: 0;
    font-size: 1rem;
  }
  .close {
    background: transparent;
    border: none;
    color: var(--text-faint);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  }
  .close:hover {
    color: var(--text);
    background: var(--bg-hover);
  }
  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5);
  }
  section h3 {
    margin: 0 0 var(--space-4);
    font-size: 1.15rem;
  }
  section + section {
    margin-top: var(--space-5);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) 0;
    gap: var(--space-3);
  }
  .segmented {
    display: flex;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
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
  .select {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
    max-width: 60%;
  }
  .hint {
    color: var(--text-faint);
    font-size: 0.8rem;
    margin: var(--space-1) 0 0;
  }
  .switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; inset: 0; background: var(--bg-active); border-radius: 24px; transition: background var(--transition); }
  .slider::before {
    content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px;
    background: var(--text-muted); border-radius: 50%; transition: transform var(--transition), background var(--transition);
  }
  input:checked + .slider { background: var(--accent); }
  input:checked + .slider::before { transform: translateX(18px); background: #fff; }
  .foot {
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border);
    color: var(--text-faint);
    font-size: 0.82rem;
  }

  @media (max-width: 640px) {
    .overlay { padding: 0; }
    .panel {
      width: 100%;
      height: 100dvh;
      border-radius: 0;
    }
    header {
      padding-top: max(var(--space-4), env(safe-area-inset-top));
    }
    .row { flex-wrap: wrap; align-items: flex-start; }
    .select { max-width: 100%; }
  }
</style>
