<script lang="ts">
  import type { SojusApp } from '@core/app';
  import type { SettingTab } from '@core/types';
  import type { StorePluginEntry } from '@core/index';
  import { resolveDirectLink } from '@core/index';
  import { useStore } from './reactive.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    app: SojusApp;
    open: boolean;
    onClose: () => void;
  }
  let { app, open, onClose }: Props = $props();

  const loaded = useStore(app.plugins.loadedStore);
  const installedStore = useStore(app.pluginStore.installedStore);

  let tab = $state<'installed' | 'store'>('installed');

  // Registered plugins (builtin + installed), recomputed when the set changes.
  let registered = $derived((loaded.value, app.plugins.getRegistered()));
  function isEnabled(id: string) {
    return app.config.isPluginEnabled(id);
  }
  function isRemote(id: string) {
    return (installedStore.value, app.pluginStore.isInstalled(id));
  }
  async function toggle(id: string, enable: boolean) {
    await app.plugins.setEnabled(id, enable);
  }
  async function uninstall(id: string) {
    await app.pluginStore.uninstall(id);
  }

  // --- Inline per-plugin settings (gear) ---
  let openSettingsFor = $state<string | null>(null);
  let settingsHost = $state<HTMLElement>();
  let currentTab: SettingTab | null = null;
  function settingTabFor(pluginId: string): SettingTab | null {
    const p = loaded.value.find((l) => l.manifest.id === pluginId);
    return p?.instance.getSettingTabs()[0] ?? null;
  }
  $effect(() => {
    if (!settingsHost) return;
    if (currentTab?.hide) currentTab.hide();
    currentTab = null;
    settingsHost.innerHTML = '';
    if (openSettingsFor) {
      const t = settingTabFor(openSettingsFor);
      if (t) {
        currentTab = t;
        t.render(settingsHost);
      }
    }
  });

  // --- Store catalog ---
  let catalog = $state<StorePluginEntry[]>([]);
  let catalogErrors = $state<{ source: string; error: string }[]>([]);
  let catalogLoading = $state(false);
  let catalogLoaded = false;

  async function loadCatalog() {
    catalogLoading = true;
    const { entries, errors } = await app.pluginStore.catalog();
    catalog = entries;
    catalogErrors = errors;
    catalogLoading = false;
    catalogLoaded = true;
  }
  $effect(() => {
    if (open && tab === 'store' && !catalogLoaded) void loadCatalog();
  });

  // --- Direct link ---
  let linkUrl = $state('');
  let linkPreview = $state<StorePluginEntry | null>(null);
  let linkError = $state('');
  let linkBusy = $state(false);
  async function checkLink() {
    linkError = '';
    linkPreview = null;
    if (!linkUrl.trim()) return;
    linkBusy = true;
    try {
      linkPreview = await resolveDirectLink(linkUrl.trim());
    } catch (e) {
      linkError = (e as Error)?.message ?? String(e);
    } finally {
      linkBusy = false;
    }
  }

  let installing = $state<string | null>(null);
  let installError = $state('');
  async function install(entry: StorePluginEntry) {
    installing = entry.id;
    installError = '';
    const res = await app.pluginStore.install(entry);
    installing = null;
    if (!res.ok) {
      installError = `${entry.name}: ${res.error}`;
    } else if (linkPreview?.id === entry.id) {
      linkPreview = null;
      linkUrl = '';
    }
  }

  function platformOk(id: string) {
    return app.plugins.supportsPlatform(id);
  }
  // Already in the app — either built in (registered) or installed from the store.
  // Such catalog entries aren't offered for install, just marked as present.
  function isPresent(id: string) {
    return (
      (loaded.value, app.plugins.getRegistered().some((m) => m.id === id)) ||
      app.pluginStore.isInstalled(id)
    );
  }
</script>

{#if open}
  <div class="overlay" onclick={onClose} role="presentation">
    <div class="panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Plugins">
      <aside class="nav">
        <h2>Plugins</h2>
        <button class="sec" class:active={tab === 'installed'} onclick={() => { tab = 'installed'; openSettingsFor = null; }}>
          <Icon name="plugin" size={16} /> Installiert
        </button>
        <button class="sec" class:active={tab === 'store'} onclick={() => { tab = 'store'; openSettingsFor = null; }}>
          <Icon name="search" size={16} /> Store
        </button>
        <button class="close" onclick={onClose}><Icon name="close" size={18} /></button>
      </aside>

      <div class="content">
        {#if openSettingsFor}
          <button class="back" onclick={() => (openSettingsFor = null)}>
            <Icon name="chevron-left" size={16} /> Zurück
          </button>
          <div bind:this={settingsHost} class="plugin-tab"></div>
        {:else if tab === 'installed'}
          <section>
            <h3>Installiert</h3>
            {#each registered as m (m.id)}
              <div class="card">
                {#if m.screenshots?.length}
                  <div class="shots">
                    {#each m.screenshots.slice(0, 3) as s}<img src={s} alt="" loading="lazy" />{/each}
                  </div>
                {/if}
                <div class="card-body">
                  <div class="meta">
                    <span class="name">{m.name}</span>
                    <span class="type">{m.type}</span>
                    {#if !platformOk(m.id)}<span class="plat">nur {m.platforms?.join('/')}</span>{/if}
                    {#if isRemote(m.id)}<span class="plat remote">Store</span>{/if}
                  </div>
                  <p class="desc">{m.description}</p>
                </div>
                <div class="actions">
                  {#if settingTabFor(m.id)}
                    <button class="gear" title="Einstellungen" onclick={() => (openSettingsFor = m.id)}>
                      <Icon name="settings" size={18} />
                    </button>
                  {/if}
                  <label class="switch" class:disabled={!platformOk(m.id)}>
                    <input type="checkbox" checked={isEnabled(m.id)} disabled={!platformOk(m.id)}
                      onchange={(e) => toggle(m.id, e.currentTarget.checked)} />
                    <span class="slider"></span>
                  </label>
                  {#if isRemote(m.id)}
                    <button class="del" title="Deinstallieren" onclick={() => uninstall(m.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </section>
        {:else}
          <section>
            <h3>Aus GitHub-Link laden</h3>
            <p class="hint">Direkter Link zur <code>manifest.json</code> eines Plugins (roh). Für eigene/Test-Plugins.</p>
            <div class="link-row">
              <input class="input" type="url" placeholder="https://…/manifest.json" bind:value={linkUrl}
                onkeydown={(e) => e.key === 'Enter' && checkLink()} />
              <button class="btn" onclick={checkLink} disabled={linkBusy}>Prüfen</button>
            </div>
            {#if linkError}<p class="err">{linkError}</p>{/if}
            {#if linkPreview}
              <div class="card">
                <div class="card-body">
                  <div class="meta"><span class="name">{linkPreview.name}</span>{#if linkPreview.version}<span class="type">v{linkPreview.version}</span>{/if}</div>
                  {#if linkPreview.description}<p class="desc">{linkPreview.description}</p>{/if}
                </div>
                <div class="actions">
                  <button class="btn primary" onclick={() => install(linkPreview!)} disabled={installing === linkPreview.id}>
                    {installing === linkPreview.id ? 'Installiere…' : 'Installieren'}
                  </button>
                </div>
              </div>
            {/if}

            <h3 style="margin-top:var(--space-5)">Store</h3>
            {#if catalogLoading}
              <p class="muted">Lade Katalog…</p>
            {:else}
              {#if catalog.length === 0}
                <p class="muted">Noch keine Plugins im Katalog (oder Quelle nicht erreichbar).</p>
              {/if}
              {#each catalog as e (e.id)}
                <div class="card">
                  {#if e.screenshots?.length}
                    <div class="shots">{#each e.screenshots.slice(0, 3) as s}<img src={s} alt="" loading="lazy" />{/each}</div>
                  {/if}
                  <div class="card-body">
                    <div class="meta">
                      <span class="name">{e.name}</span>
                      {#if e.version}<span class="type">v{e.version}</span>{/if}
                      {#if e.platforms}<span class="plat">{e.platforms.join('/')}</span>{/if}
                      {#if typeof e.downloads === 'number'}<span class="dl">↓ {e.downloads}</span>{/if}
                    </div>
                    {#if e.description}<p class="desc">{e.description}</p>{/if}
                  </div>
                  <div class="actions">
                    {#if isPresent(e.id)}
                      <span class="done"><Icon name="check" size={16} /> Bereits vorhanden</span>
                    {:else}
                      <button class="btn primary" onclick={() => install(e)} disabled={installing === e.id}>
                        {installing === e.id ? 'Installiere…' : 'Installieren'}
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
              {#each catalogErrors as err}
                <p class="err">Quelle „{err.source}": {err.error}</p>
              {/each}
            {/if}
            {#if installError}<p class="err">{installError}</p>{/if}
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center; z-index: 900; padding: var(--space-4);
  }
  .panel {
    width: min(860px, 95vw); height: min(620px, 90vh); background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow);
    display: flex; overflow: hidden;
  }
  .nav {
    width: 200px; background: var(--bg-elevated); border-right: 1px solid var(--border);
    padding: var(--space-4) var(--space-2); display: flex; flex-direction: column; gap: 2px; position: relative;
  }
  .nav h2 {
    font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--text-faint); margin: 0 0 var(--space-3) var(--space-3);
  }
  .sec {
    display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
    background: transparent; border: none; border-radius: var(--radius-md); color: var(--text-muted);
    font-size: 0.9rem; text-align: left;
  }
  .sec:hover { background: var(--bg-hover); color: var(--text); }
  .sec.active { background: var(--bg-active); color: var(--text); }
  .close {
    position: absolute; top: var(--space-3); right: var(--space-3); background: transparent;
    border: none; color: var(--text-faint); padding: var(--space-1); border-radius: var(--radius-sm);
  }
  .close:hover { color: var(--text); background: var(--bg-hover); }
  .content { flex: 1; overflow-y: auto; padding: var(--space-5); }
  section h3 { margin: 0 0 var(--space-4); font-size: 1.15rem; }
  .card {
    display: flex; flex-direction: column; gap: var(--space-2);
    padding: var(--space-3) 0; border-bottom: 1px solid var(--border);
  }
  .shots { display: flex; gap: var(--space-2); overflow-x: auto; }
  .shots img { height: 96px; border-radius: var(--radius-md); border: 1px solid var(--border); }
  .card-body { display: flex; flex-direction: column; gap: 2px; }
  .meta { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; }
  .name { font-weight: 600; }
  .type, .plat, .dl {
    font-size: 0.7rem; text-transform: uppercase; color: var(--text-faint);
    background: var(--bg-active); padding: 1px 6px; border-radius: 4px;
  }
  .plat { color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, transparent); }
  .plat.remote { color: var(--text-muted); background: var(--bg-active); }
  .desc { font-size: 0.85rem; color: var(--text-muted); margin: 0; }
  .actions { display: flex; align-items: center; gap: var(--space-2); }
  .gear, .del {
    background: transparent; border: none; color: var(--text-muted);
    padding: var(--space-2); border-radius: var(--radius-md); display: grid; place-items: center;
  }
  .gear:hover { background: var(--bg-hover); color: var(--text); }
  .del:hover { background: var(--bg-hover); color: var(--danger, #e5484d); }
  .btn {
    background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text);
    border-radius: var(--radius-md); padding: var(--space-2) var(--space-4); font-size: 0.85rem;
  }
  .btn.primary { background: var(--accent); color: var(--accent-text); border-color: transparent; }
  .btn:disabled { opacity: 0.5; }
  .link-row { display: flex; gap: var(--space-2); }
  .input {
    flex: 1; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text);
    border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); font-size: 0.85rem;
  }
  .hint { color: var(--text-faint); font-size: 0.8rem; margin: 0 0 var(--space-2); }
  .err { color: var(--danger, #e5484d); font-size: 0.82rem; }
  .muted { color: var(--text-faint); }
  .done { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-size: 0.85rem; }
  .back {
    display: inline-flex; align-items: center; gap: 4px; background: transparent; border: none;
    color: var(--text-muted); font-size: 0.85rem; padding: 0 0 var(--space-3);
  }
  .switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
  .switch.disabled { opacity: 0.4; pointer-events: none; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; inset: 0; background: var(--bg-active); border-radius: 24px; transition: background var(--transition); }
  .slider::before {
    content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px;
    background: var(--text-muted); border-radius: 50%; transition: transform var(--transition), background var(--transition);
  }
  input:checked + .slider { background: var(--accent); }
  input:checked + .slider::before { transform: translateX(18px); background: #fff; }

  @media (max-width: 640px) {
    .overlay { padding: 0; }
    .panel { width: 100%; height: 100dvh; border-radius: 0; flex-direction: column; }
    .nav {
      width: 100%; flex-direction: row; align-items: center; overflow-x: auto; scrollbar-width: none;
      border-right: none; border-bottom: 1px solid var(--border); padding: var(--space-2);
      padding-top: max(var(--space-2), env(safe-area-inset-top)); gap: var(--space-1);
    }
    .nav::-webkit-scrollbar { display: none; }
    .nav h2 { display: none; }
    .sec { flex-shrink: 0; white-space: nowrap; }
    .close { position: static; margin-left: auto; flex-shrink: 0; }
    .content { padding: var(--space-4); }
  }
</style>
