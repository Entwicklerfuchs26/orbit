<script lang="ts">
  import type { App } from '@core/index';
  import { useStore } from '@shell/reactive.svelte';
  import type { WallpaperManager } from './manager';
  import Toggle from './Toggle.svelte';
  import ImagePicker from './ImagePicker.svelte';
  import { SCHEME_CHARACTERS, FINISHES } from '../theme/palette';
  import { VIEW_MODES, FILL_MODES, TRANSITIONS } from './types';
  import { isNativeApp, openLiveWallpaperPicker, isLiveWallpaperActive } from '../../platform/wallpaper';

  const native = isNativeApp();

  interface Props {
    app: App;
    manager: WallpaperManager;
  }
  let { app, manager }: Props = $props();

  const wpState = useStore(manager.state);
  const urls = useStore(manager.urls);
  const themeMode = useStore(app.theme.mode);

  // Whether SKWD Wall is the currently active OS live wallpaper (reinstalling
  // the APK resets it, so surface the status).
  let liveActive = $state<boolean | null>(null);
  $effect(() => {
    if (wpState.value.liveWallpaper && wpState.value.deviceMobile && isNativeApp()) {
      void isLiveWallpaperActive().then((v) => (liveActive = v));
    } else {
      liveActive = null;
    }
  });

  // Visual image picker for schedule rules (targetType 'item').
  let pickerRuleId = $state<string | null>(null);
  function onPickImage(id: string) {
    if (pickerRuleId) manager.updateScheduleRule(pickerRuleId, { targetType: 'item', targetId: id });
    pickerRuleId = null;
  }

  let pinned = $derived(wpState.value.menuMode === 'pinned');
  let behaviour = $derived(wpState.value.paletteBehaviour);
  let vm = $derived(wpState.value.viewMode);

  // Theme presets UI state
  let presetName = $state('');
  let exportText = $state('');
  let importOpen = $state(false);
  let importText = $state('');
  let importMsg = $state('');
  function savePreset() {
    const n = presetName.trim();
    if (!n) return;
    manager.saveThemePreset(n);
    presetName = '';
  }
  function doExport() {
    exportText = manager.exportThemePresets();
  }
  function doImport() {
    const n = manager.importThemePresets(importText);
    importMsg = n < 0 ? 'Ungültiges JSON' : `${n} Preset(s) importiert`;
    if (n >= 0) {
      importText = '';
      importOpen = false;
      setTimeout(() => (importMsg = ''), 2500);
    }
  }
</script>

<div class="wp-settings">
  <!-- ===== Geräte ===== -->
  {#if native}
    <h3>Geräte</h3>
    <div class="field">
      <div class="row">
        <span class="label">Handy (Android)</span>
        <Toggle checked={wpState.value.deviceMobile} onchange={(v) => manager.setDeviceMobile(v)} label="Handy" />
      </div>
      <p class="hint">An: Systemhintergrund setzen, Auto-Wechsel aufs OS, Live-Wallpaper. Aus: reine In-App-Ansicht.</p>
    </div>
    {#if wpState.value.deviceMobile}
      <div class="field">
        <div class="row">
          <span class="label">Live-Wallpaper (animierter Systemhintergrund)</span>
          <Toggle checked={wpState.value.liveWallpaper} onchange={(v) => manager.setLiveWallpaper(v)} label="Live-Wallpaper" />
        </div>
        <p class="hint">Animierte Übergänge am System-Hintergrund + Video-Wallpaper. Zum Aktivieren einmal unten tippen und „SKWD Wall" als Live-Wallpaper auswählen; danach folgt der Systemhintergrund automatisch deinem aktiven Wallpaper.</p>
        {#if wpState.value.liveWallpaper}
          {#if liveActive === true}
            <p class="hint live-ok">✓ „SKWD Wall" ist als Live-Wallpaper aktiv.</p>
          {:else if liveActive === false}
            <p class="hint live-warn">⚠ „SKWD Wall" ist gerade NICHT aktiv (nach einer Neuinstallation setzt Android das zurück). Unten neu auswählen.</p>
          {/if}
          <button class="live-activate" onclick={() => openLiveWallpaperPicker()}>Als Handy-Hintergrund aktivieren…</button>
        {/if}
      </div>
    {/if}
  {/if}

  <!-- ===== Ansicht / Layout ===== -->
  <h3>Ansicht</h3>
  <div class="field">
    <span class="label">Anordnung der Wallpaper</span>
    <div class="seg wrap">
      {#each VIEW_MODES as m}
        <button class:on={wpState.value.viewMode === m.value} onclick={() => manager.setViewMode(m.value)}>{m.label}</button>
      {/each}
    </div>
  </div>

  <!-- Layout-Feintuning für den aktiven Modus -->
  {#if vm === 'wall'}
    <div class="field">
      <span class="label">Spalten · {wpState.value.wallColumns === 0 ? 'Auto' : wpState.value.wallColumns}</span>
      <input type="range" min="0" max="6" step="1" value={wpState.value.wallColumns}
        oninput={(e) => manager.setWallColumns(Number((e.target as HTMLInputElement).value))} />
      <p class="hint">Auto = füllt nach Kachelgröße. Sonst feste Spaltenzahl.</p>
    </div>
  {:else if vm === 'slices'}
    <div class="field">
      <span class="label">Neigung · {wpState.value.slicesSkew}°</span>
      <input type="range" min="0" max="20" step="1" value={wpState.value.slicesSkew}
        oninput={(e) => manager.setSlicesSkew(Number((e.target as HTMLInputElement).value))} />
    </div>
    <div class="field">
      <span class="label">Streifenhöhe · {wpState.value.slicesHeight}</span>
      <input type="range" min="4" max="14" step="1" value={wpState.value.slicesHeight}
        oninput={(e) => manager.setSlicesHeight(Number((e.target as HTMLInputElement).value))} />
      <p class="hint">Kleiner = höhere Streifen.</p>
    </div>
  {:else if vm === 'geometric'}
    <div class="field">
      <span class="label">Wabengröße · {wpState.value.hexSize === 0 ? 'Auto' : wpState.value.hexSize + 'px'}</span>
      <input type="range" min="0" max="160" step="4" value={wpState.value.hexSize}
        oninput={(e) => manager.setHexSize(Number((e.target as HTMLInputElement).value))} />
      <p class="hint">0 = automatisch an die Breite anpassen.</p>
    </div>
  {:else if vm === 'depth'}
    <div class="field">
      <span class="label">Neigung · {wpState.value.depthTilt}°</span>
      <input type="range" min="0" max="20" step="1" value={wpState.value.depthTilt}
        oninput={(e) => manager.setDepthTilt(Number((e.target as HTMLInputElement).value))} />
    </div>
  {:else if vm === 'hand'}
    <div class="field">
      <span class="label">Fächerung · {wpState.value.handSpread}°</span>
      <input type="range" min="2" max="16" step="1" value={wpState.value.handSpread}
        oninput={(e) => manager.setHandSpread(Number((e.target as HTMLInputElement).value))} />
    </div>
  {/if}

  <!-- ===== Erscheinungsbild / Theme ===== -->
  <h3>Erscheinungsbild</h3>

  <div class="field">
    <span class="label">Modus</span>
    <div class="seg">
      {#each [['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']] as [v, l]}
        <button class:on={themeMode.value === v} onclick={() => app.theme.setMode(v as any)}>{l}</button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span class="label">Farbcharakter</span>
    <div class="seg wrap">
      {#each SCHEME_CHARACTERS as c}
        <button class:on={wpState.value.schemeCharacter === c.value} onclick={() => manager.setSchemeCharacter(c.value)}>
          {c.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span class="label">Finish</span>
    <div class="seg">
      {#each FINISHES as f}
        <button class:on={wpState.value.finish === f.value} onclick={() => manager.setFinish(f.value)}>{f.label}</button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span class="label">Palette</span>
    <div class="seg">
      <button class:on={behaviour === 'follow'} onclick={() => manager.setPaletteBehaviour('follow')}>Wallpaper folgen</button>
      <button class:on={behaviour === 'fixed'} onclick={() => manager.setPaletteBehaviour('fixed')}>Feste Farbe</button>
      <button class:on={behaviour === 'keep'} onclick={() => manager.setPaletteBehaviour('keep')}>Beibehalten</button>
    </div>
    {#if behaviour === 'fixed'}
      <div class="accent-row">
        <input type="color" value={wpState.value.fixedSeed} oninput={(e) => manager.setFixedSeed((e.target as HTMLInputElement).value)} />
        <input class="hex" type="text" value={wpState.value.fixedSeed} oninput={(e) => manager.setFixedSeed((e.target as HTMLInputElement).value)} spellcheck="false" />
      </div>
    {/if}
    <p class="hint">
      {behaviour === 'follow'
        ? 'Farben werden aus dem aktiven Wallpaper erzeugt.'
        : behaviour === 'fixed'
          ? 'Immer diese Farbe, egal welches Wallpaper.'
          : 'Farben bleiben, auch wenn das Wallpaper wechselt.'}
    </p>
  </div>

  <div class="field">
    <span class="label">Kontrast · {wpState.value.themeContrast === 0 ? 'Standard' : (wpState.value.themeContrast > 0 ? '+' : '') + Math.round(wpState.value.themeContrast * 100) + '%'}</span>
    <input type="range" min="-1" max="1" step="0.1" value={wpState.value.themeContrast}
      oninput={(e) => manager.setThemeContrast(Number((e.target as HTMLInputElement).value))} />
  </div>

  <div class="field">
    <span class="label">UI-Größe · {Math.round(wpState.value.uiScale * 100)}%</span>
    <input type="range" min="0.5" max="2" step="0.05" value={wpState.value.uiScale}
      oninput={(e) => manager.setUiScale(Number((e.target as HTMLInputElement).value))} />
  </div>

  <!-- Theme-Presets -->
  <div class="field">
    <span class="label">Theme-Presets</span>
    {#if wpState.value.themePresets.length}
      <div class="chips">
        {#each wpState.value.themePresets as p (p.id)}
          <span class="preset-chip">
            <button class="preset-apply" onclick={() => manager.applyThemePreset(p.id)}>{p.name}</button>
            <button class="preset-del" onclick={() => manager.deleteThemePreset(p.id)} aria-label="Preset löschen">×</button>
          </span>
        {/each}
      </div>
    {/if}
    <div class="preset-save">
      <input class="preset-name" bind:value={presetName} placeholder="Aktuelles Theme speichern als…" spellcheck="false"
        onkeydown={(e) => { if (e.key === 'Enter') savePreset(); }} />
      <button class="preset-btn" onclick={savePreset}>Speichern</button>
    </div>
    <div class="preset-io">
      <button class="preset-btn" onclick={doExport}>Exportieren</button>
      <button class="preset-btn" onclick={() => (importOpen = !importOpen)}>Importieren</button>
    </div>
    {#if exportText}
      <textarea class="preset-text" readonly rows="4">{exportText}</textarea>
    {/if}
    {#if importOpen}
      <textarea class="preset-text" bind:value={importText} rows="4" placeholder="Presets-JSON hier einfügen…"></textarea>
      <button class="preset-btn" onclick={doImport}>Import bestätigen</button>
      {#if importMsg}<p class="hint">{importMsg}</p>{/if}
    {/if}
  </div>

  <!-- ===== Menü ===== -->
  <h3>Menü</h3>

  <div class="field">
    <span class="label">Seite</span>
    <div class="seg">
      <button class:on={wpState.value.menuSide === 'left'} onclick={() => manager.setMenuSide('left')}>Links</button>
      <button class:on={wpState.value.menuSide === 'right'} onclick={() => manager.setMenuSide('right')}>Rechts</button>
    </div>
  </div>

  <div class="field">
    <span class="label">Verhalten</span>
    <div class="seg">
      <button class:on={!pinned} onclick={() => manager.setMenuMode('auto')}>Ausblenden</button>
      <button class:on={pinned} onclick={() => manager.setMenuMode('pinned')}>Fest</button>
    </div>
    <p class="hint">
      {pinned ? 'Das Menü bleibt dauerhaft sichtbar.' : 'Am Rand tippen (Handy) / Maus an den Rand (PC) → Menü klappt aus.'}
    </p>
  </div>

  {#if !pinned}
    <div class="field">
      <span class="label">Ausblenden nach · {(wpState.value.autoHideMs / 1000).toFixed(1)} s</span>
      <input type="range" min="0.5" max="10" step="0.5" value={wpState.value.autoHideMs / 1000}
        oninput={(e) => manager.setAutoHideMs(Math.round(Number((e.target as HTMLInputElement).value) * 1000))} />
    </div>
  {/if}

  <!-- ===== Wallpaper ===== -->
  <h3>Wallpaper</h3>
  <div class="field">
    <span class="label">Anpassung</span>
    <div class="seg wrap">
      {#each FILL_MODES as f}
        <button class:on={wpState.value.fillMode === f.value} onclick={() => manager.setFillMode(f.value)}>{f.label}</button>
      {/each}
    </div>
  </div>
  <div class="field">
    <span class="label">Abdunkeln · {Math.round(wpState.value.dim * 100)}%</span>
    <input type="range" min="0" max="0.85" step="0.05" value={wpState.value.dim}
      oninput={(e) => manager.setDim(Number((e.target as HTMLInputElement).value))} />
  </div>

  <!-- ===== Kacheln ===== -->
  <h3>Kacheln</h3>
  <div class="field">
    <span class="label">Größe · {wpState.value.tileSize}px</span>
    <input type="range" min="80" max="240" step="10" value={wpState.value.tileSize}
      oninput={(e) => manager.setTileSize(Number((e.target as HTMLInputElement).value))} />
  </div>
  <div class="field">
    <span class="label">Eckenradius · {wpState.value.tileRadius}px</span>
    <input type="range" min="0" max="28" step="2" value={wpState.value.tileRadius}
      oninput={(e) => manager.setTileRadius(Number((e.target as HTMLInputElement).value))} />
  </div>

  <!-- ===== Übergänge ===== -->
  <h3>Übergang beim Wechsel</h3>
  <div class="field">
    <span class="label">Animation</span>
    <div class="seg wrap">
      {#each TRANSITIONS as t}
        <button class:on={wpState.value.transitionType === t.value} onclick={() => manager.setTransitionType(t.value)}>{t.label}</button>
      {/each}
    </div>
  </div>
  {#if wpState.value.transitionType !== 'none'}
    <div class="field">
      <span class="label">Dauer · {(wpState.value.transitionMs / 1000).toFixed(1)} s</span>
      <input type="range" min="150" max="2000" step="50" value={wpState.value.transitionMs}
        oninput={(e) => manager.setTransitionMs(Number((e.target as HTMLInputElement).value))} />
    </div>
  {/if}

  <!-- ===== Automatik ===== -->
  <h3>Automatischer Wechsel</h3>
  <div class="field">
    <div class="row">
      <span class="label">Wallpaper automatisch wechseln</span>
      <Toggle checked={wpState.value.randomEnabled} onchange={(v) => manager.setRandomEnabled(v)} label="Automatischer Wechsel" />
    </div>
  </div>
  {#if wpState.value.randomEnabled}
    <div class="field">
      <span class="label">Intervall · {wpState.value.randomIntervalSec < 60 ? `${wpState.value.randomIntervalSec}s` : `${Math.round(wpState.value.randomIntervalSec / 60)} min`}</span>
      <input type="range" min="10" max="3600" step="10" value={wpState.value.randomIntervalSec}
        oninput={(e) => manager.setRandomInterval(Number((e.target as HTMLInputElement).value))} />
    </div>
    <div class="field">
      <span class="label">Nur Favoriten</span>
      <div class="seg">
        <button class:on={!wpState.value.randomFavOnly} onclick={() => manager.setRandomFavOnly(false)}>Alle</button>
        <button class:on={wpState.value.randomFavOnly} onclick={() => manager.setRandomFavOnly(true)}>Favoriten</button>
      </div>
    </div>
    {#if native && wpState.value.deviceMobile && !wpState.value.liveWallpaper}
      <div class="field">
        <span class="label">Beim Wechsel Systemhintergrund mitsetzen</span>
        <div class="chips">
          <button class="chip" class:on={wpState.value.randomSetHome} onclick={() => manager.setRandomSetHome(!wpState.value.randomSetHome)}>🏠 Startbildschirm</button>
          <button class="chip" class:on={wpState.value.randomSetLock} onclick={() => manager.setRandomSetLock(!wpState.value.randomSetLock)}>🔒 Sperrbildschirm</button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- ===== Zeitplan ===== -->
  <h3>Zeitplan</h3>
  <div class="field">
    <div class="row">
      <span class="label">Wallpaper nach Uhrzeit wechseln</span>
      <Toggle checked={wpState.value.scheduleEnabled} onchange={(v) => manager.setScheduleEnabled(v)} label="Zeitplan" />
    </div>
    <p class="hint">Zu einer Uhrzeit automatisch auf ein Bild, eine Sammlung oder zufällig wechseln.</p>
  </div>
  {#if wpState.value.scheduleEnabled}
    {#each wpState.value.schedule as rule (rule.id)}
      {@const img = wpState.value.items.find((i) => i.id === rule.targetId)}
      <div class="sched-row">
        <input class="sched-time" type="time" value={rule.time}
          oninput={(e) => manager.updateScheduleRule(rule.id, { time: (e.target as HTMLInputElement).value })} />
        <select class="sched-type"
          onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value as 'random' | 'collection' | 'item';
            manager.updateScheduleRule(rule.id, { targetType: v, targetId: v === 'random' ? undefined : rule.targetId });
          }}>
          <option value="random" selected={rule.targetType === 'random'}>🎲 Zufällig</option>
          <option value="collection" selected={rule.targetType === 'collection'}>📁 Sammlung</option>
          <option value="item" selected={rule.targetType === 'item'}>🖼 Bild</option>
        </select>
        {#if rule.targetType === 'collection'}
          <select class="sched-target"
            onchange={(e) => manager.updateScheduleRule(rule.id, { targetId: (e.target as HTMLSelectElement).value })}>
            <option value="" disabled selected={!rule.targetId}>Sammlung wählen…</option>
            {#each wpState.value.collections as c (c.id)}
              <option value={c.id} selected={rule.targetId === c.id}>{c.name}</option>
            {/each}
          </select>
        {:else if rule.targetType === 'item'}
          <button class="sched-pick" onclick={() => (pickerRuleId = rule.id)}>
            {#if img}
              <span class="sched-thumb" style={urls.value[img.id] ? `background-image:url(${urls.value[img.id]})` : ''}></span>
              <span class="sched-pickname">{img.name}</span>
            {:else}
              🖼 Bild wählen
            {/if}
          </button>
        {/if}
        <button class="sched-del" onclick={() => manager.removeScheduleRule(rule.id)} aria-label="Regel löschen" title="Regel löschen">×</button>
      </div>
    {/each}
    <button class="sched-add" onclick={() => manager.addScheduleRule()}>＋ Regel hinzufügen</button>
  {/if}
</div>

{#if pickerRuleId}
  <ImagePicker {manager} title="Bild für Zeitplan wählen" onpick={onPickImage} onclose={() => (pickerRuleId = null)} />
{/if}

<style>
  .wp-settings { display: flex; flex-direction: column; gap: var(--space-4); }
  h3 {
    margin: var(--space-2) 0 0;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-faint);
  }
  h3:first-child { margin-top: 0; }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .label { font-size: 0.9rem; color: var(--text-muted); }
  .hint { margin: 0; font-size: 0.78rem; color: var(--text-faint); line-height: 1.4; }
  .seg {
    display: flex; gap: 4px; flex-wrap: wrap;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: 3px;
  }
  .seg.wrap button { flex: 0 0 auto; }
  .seg button {
    flex: 1; padding: var(--space-2) var(--space-3); background: transparent; border: none;
    border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.82rem; white-space: nowrap;
  }
  .seg button.on { background: var(--color-primary); color: #fff; }
  .accent-row { display: flex; gap: var(--space-2); align-items: center; }
  input[type='color'] { width: 48px; height: 38px; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-elevated); }
  .hex { flex: 1; padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-family: var(--font-mono); text-transform: uppercase; }
  input[type='range'] { width: 100%; accent-color: var(--color-primary); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    padding: var(--space-2) var(--space-3); background: var(--bg-elevated);
    border: 1px solid var(--border); border-radius: var(--radius-md);
    color: var(--text-muted); font-size: 0.82rem;
  }
  .chip.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .sched-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .sched-time {
    padding: var(--space-2); background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem;
  }
  .sched-type {
    padding: var(--space-2); background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem;
  }
  .sched-target {
    flex: 1; min-width: 0; padding: var(--space-2); background: var(--bg-elevated);
    border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem;
  }
  .sched-pick {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 5px var(--space-2);
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
    color: var(--text); font-size: 0.85rem; text-align: left;
  }
  .sched-thumb {
    flex: 0 0 auto; width: 28px; height: 28px; border-radius: var(--radius-sm);
    background-size: cover; background-position: center; background-color: var(--color-surface-variant);
  }
  .sched-pickname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sched-del {
    flex: 0 0 auto; width: 32px; height: 32px; border-radius: var(--radius-md);
    background: transparent; border: 1px solid var(--border); color: var(--text-muted); font-size: 1.1rem; line-height: 1;
  }
  .sched-add {
    align-self: flex-start; padding: var(--space-2) var(--space-3); background: var(--bg-elevated);
    border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem;
  }
  .live-activate {
    align-self: flex-start; padding: var(--space-2) var(--space-4); background: var(--color-primary);
    border: none; border-radius: var(--radius-md); color: #fff; font-size: 0.85rem; font-weight: 600;
  }
  .live-ok { color: #46a758; }
  .live-warn { color: #f5a524; }
  .preset-chip { display: inline-flex; align-items: stretch; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
  .preset-apply { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: none; color: var(--text); font-size: 0.82rem; }
  .preset-del { padding: 0 8px; background: var(--bg-elevated); border: none; border-left: 1px solid var(--border); color: var(--text-muted); font-size: 1rem; }
  .preset-save, .preset-io { display: flex; gap: var(--space-2); }
  .preset-name { flex: 1; min-width: 0; padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; }
  .preset-btn { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.82rem; white-space: nowrap; }
  .preset-text { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-family: var(--font-mono); font-size: 0.75rem; padding: var(--space-2); resize: vertical; }
</style>
