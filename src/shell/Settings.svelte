<script lang="ts">
  import type { SojusApp } from '@core/app';
  import { LAST_SESSION } from '@core/app';
  import type { SettingTab } from '@core/types';
  import { useStore } from './reactive.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
    open: boolean;
    onClose: () => void;
  }
  let { app, open, onClose }: Props = $props();

  const loaded = useStore(app.plugins.loadedStore);
  const themeMode = useStore(app.theme.mode);
  const navItems = useStore(app.navigation.store);

  // Start-page choice: "Letzte Sitzung" or any registered view.
  let startPage = $state(app.getStartPagePref());
  let startCandidates = $derived(navItems.value.map((i) => ({ id: i.viewId, name: i.name })));
  function setStartPage(v: string) {
    startPage = v;
    app.setStartPagePref(v);
  }

  let activeSection = $state<string>('general');
  let tabContainer = $state<HTMLElement>();
  let currentTab: SettingTab | null = null;

  // All registered plugins (loaded or not) so the user can enable them.
  let registered = $derived(app.plugins.getRegistered());

  function isEnabled(id: string): boolean {
    return app.config.isPluginEnabled(id);
  }

  async function toggle(id: string, enable: boolean) {
    await app.plugins.setEnabled(id, enable);
  }

  // Collect setting tabs from loaded plugins.
  let pluginTabs = $derived(
    loaded.value.flatMap((p) =>
      p.instance.getSettingTabs().map((t) => ({ pluginId: p.manifest.id, tab: t })),
    ),
  );

  let inPluginsArea = $derived(
    activeSection === 'plugins' || pluginTabs.some((pt) => pt.tab.id === activeSection),
  );

  function firstTabFor(pluginId: string): string | null {
    return pluginTabs.find((pt) => pt.pluginId === pluginId)?.tab.id ?? null;
  }

  $effect(() => {
    if (!tabContainer) return;
    if (currentTab?.hide) currentTab.hide();
    currentTab = null;
    tabContainer.innerHTML = '';

    const match = pluginTabs.find((pt) => pt.tab.id === activeSection);
    if (match) {
      currentTab = match.tab;
      match.tab.render(tabContainer);
    }
  });

  function setMode(mode: 'light' | 'dark' | 'auto') {
    app.theme.setMode(mode);
  }
</script>

{#if open}
  <div class="overlay" onclick={onClose} role="presentation">
    <div class="panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <aside class="nav">
        <h2>Einstellungen</h2>
        <button class="sec" class:active={activeSection === 'general'} onclick={() => (activeSection = 'general')}>
          <Icon name="settings" size={16} /> Allgemein
        </button>
        <button class="sec" class:active={inPluginsArea} onclick={() => (activeSection = 'plugins')}>
          <Icon name="plugin" size={16} /> Plugins
        </button>
        <button class="close" onclick={onClose}><Icon name="close" size={18} /></button>
      </aside>

      <div class="content">
        {#if activeSection === 'general'}
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
        {:else if activeSection === 'plugins'}
          <section>
            <h3>Plugins</h3>
            {#if registered.length === 0}
              <p class="muted">Keine Plugins registriert.</p>
            {/if}
            {#each registered as m (m.id)}
              <div class="plugin-row">
                <div class="plugin-meta">
                  <span class="plugin-name">{m.name}</span>
                  <span class="plugin-type">{m.type}</span>
                  {#if m.platforms && !app.plugins.supportsPlatform(m.id)}
                    <span class="plugin-platform">nur {m.platforms.join('/')}</span>
                  {/if}
                  <span class="plugin-desc">{m.description}</span>
                </div>
                <div class="plugin-actions">
                  {#if firstTabFor(m.id)}
                    <button class="gear" onclick={() => (activeSection = firstTabFor(m.id)!)} title="Einstellungen">
                      <Icon name="settings" size={18} />
                    </button>
                  {/if}
                  <label class="switch" class:disabled={!app.plugins.supportsPlatform(m.id)}>
                    <input
                      type="checkbox"
                      checked={isEnabled(m.id)}
                      disabled={!app.plugins.supportsPlatform(m.id)}
                      onchange={(e) => toggle(m.id, e.currentTarget.checked)}
                    />
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
            {/each}
          </section>
        {:else}
          <section>
            <button class="back" onclick={() => (activeSection = 'plugins')}>
              <Icon name="chevron-left" size={16} /> Plugins
            </button>
            <div bind:this={tabContainer} class="plugin-tab"></div>
          </section>
        {/if}
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
    width: min(860px, 95vw);
    height: min(620px, 90vh);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    display: flex;
    overflow: hidden;
  }
  .nav {
    width: 220px;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border);
    padding: var(--space-4) var(--space-2);
    display: flex;
    flex-direction: column;
    gap: 2px;
    position: relative;
  }
  .nav h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-faint);
    margin: 0 0 var(--space-3) var(--space-3);
  }
  .sec {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-size: 0.9rem;
    text-align: left;
  }
  .sec:hover {
    background: var(--bg-hover);
    color: var(--text);
  }
  .sec.active {
    background: var(--bg-active);
    color: var(--text);
  }
  .close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
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
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) 0;
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
  .plugin-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
  }
  .plugin-meta {
    flex: 1;
    display: grid;
    grid-template-columns: auto auto;
    gap: 2px var(--space-2);
    align-items: baseline;
  }
  .plugin-name {
    font-weight: 600;
  }
  .plugin-type {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--text-faint);
    background: var(--bg-active);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .plugin-platform {
    font-size: 0.7rem;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .switch.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
  .plugin-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  .gear {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
  }
  .gear:hover {
    background: var(--bg-hover);
    color: var(--text);
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.85rem;
    padding: 0 0 var(--space-3);
  }
  .back:hover {
    color: var(--text);
  }
  .plugin-desc {
    grid-column: 1 / -1;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .muted {
    color: var(--text-faint);
  }
  .switch {
    position: relative;
    width: 42px;
    height: 24px;
    flex-shrink: 0;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    inset: 0;
    background: var(--bg-active);
    border-radius: 24px;
    transition: background var(--transition);
  }
  .slider::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    top: 3px;
    background: var(--text-muted);
    border-radius: 50%;
    transition: transform var(--transition), background var(--transition);
  }
  input:checked + .slider {
    background: var(--accent);
  }
  input:checked + .slider::before {
    transform: translateX(18px);
    background: #fff;
  }

  /* Mobile / narrow: stack nav on top, content full width. Fixes the
     squished two-column layout where Hell/Dunkel got clipped. */
  @media (max-width: 640px) {
    .overlay {
      padding: 0;
    }
    .panel {
      width: 100%;
      height: 100%;
      height: 100dvh;
      border-radius: 0;
      flex-direction: column;
    }
    .nav {
      width: 100%;
      flex-direction: row;
      align-items: center;
      overflow-x: auto;
      scrollbar-width: none;
      border-right: none;
      border-bottom: 1px solid var(--border);
      padding: var(--space-2);
      padding-top: max(var(--space-2), env(safe-area-inset-top));
      gap: var(--space-1);
    }
    .nav::-webkit-scrollbar {
      display: none;
    }
    .nav h2 {
      display: none;
    }
    .sec {
      flex-shrink: 0;
      white-space: nowrap;
    }
    .close {
      position: static;
      margin-left: auto;
      flex-shrink: 0;
    }
    .content {
      padding: var(--space-4);
    }
    .row {
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--space-3);
    }
    .segmented {
      max-width: 100%;
    }
  }
</style>
