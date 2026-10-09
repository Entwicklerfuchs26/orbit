<script lang="ts">
  import type { App } from '@core/index';
  import type { SettingSection, SettingsSchema } from '@core/settings';
  import { useStore } from '@shell/reactive.svelte';
  import SettingsView from '@shell/SettingsView.svelte';
  import type { WallpaperManager } from './manager';
  import ImagePicker from './ImagePicker.svelte';
  import { SCHEME_CHARACTERS, FINISHES } from '../theme/palette';
  import { VIEW_MODES, FILL_MODES, TRANSITIONS, RECOLOUR_PALETTES } from './types';
  import { isNativeApp, openLiveWallpaperPicker, isLiveWallpaperActive } from '../../platform/wallpaper';
  import { supportsFolders } from './folders';

  interface Props {
    app: App;
    manager: WallpaperManager;
  }
  let { app, manager }: Props = $props();

  const native = isNativeApp();
  const wpState = useStore(manager.state);
  const urls = useStore(manager.urls);
  const themeMode = useStore(app.theme.mode);

  let s = $derived(wpState.value);
  let vm = $derived(s.viewMode);

  // Live-wallpaper active status (reinstalling the APK resets it).
  let liveActive = $state<boolean | null>(null);
  $effect(() => {
    if (s.liveWallpaper && s.deviceMobile && native) {
      void isLiveWallpaperActive().then((v) => (liveActive = v));
    } else liveActive = null;
  });

  // Schedule image picker.
  let pickerRuleId = $state<string | null>(null);
  function onPickImage(id: string) {
    if (pickerRuleId) manager.updateScheduleRule(pickerRuleId, { targetType: 'item', targetId: id });
    pickerRuleId = null;
  }

  // Theme-preset UI state.
  let presetName = $state('');
  let exportText = $state('');
  let importOpen = $state(false);
  let importText = $state('');
  let importMsg = $state('');

  const opt = <T,>(arr: { value: T; label: string }[]) =>
    arr.map((x) => ({ value: String(x.value), label: x.label }));

  // Folder sources.
  const foldersSupported = supportsFolders();
  let folderBusy = $state(false);
  let folderMsg = $state('');
  async function addFolderSrc(kind: 'image' | 'video') {
    folderBusy = true;
    folderMsg = '';
    const r = await manager.addFolder(kind);
    folderBusy = false;
    folderMsg = r.ok ? `${r.count} Datei(en) aus dem Ordner übernommen.` : '';
  }
  async function reconnectFolders() {
    folderBusy = true;
    await manager.reconnectFolders();
    folderBusy = false;
  }

  // Declarative sections. `show` closures read `s`/`vm` → reactive in SettingsView.
  let sections: SettingSection[] = $derived([
    // Geräte (native only)
    ...(native
      ? [
          {
            title: 'Geräte', category: 'Verhalten',
            defs: [
              { key: 'deviceMobile', type: 'toggle', label: 'Handy (Android)', desc: 'Systemhintergrund, Live-Wallpaper, Auto-OS. Aus: reine In-App-Ansicht.' },
              { key: 'liveWallpaper', type: 'toggle', label: 'Live-Wallpaper', desc: 'Animierter Systemhintergrund (Bild-Übergänge + Video).', show: () => s.deviceMobile },
              { type: 'custom', customId: 'live', show: () => s.deviceMobile && s.liveWallpaper },
            ],
          } as SettingSection,
        ]
      : []),
    // Ansicht
    {
      title: 'Ansicht', category: 'Ansicht',
      defs: [
        { key: 'viewMode', type: 'segment', label: 'Anordnung', options: opt(VIEW_MODES) },
        // per-mode geometry
        { key: 'wallColumns', type: 'slider', label: 'Spalten (0 = Auto)', min: 0, max: 8, step: 1, show: () => vm === 'wall' },
        { key: 'hexColumns', type: 'slider', label: 'Spalten (über die Breite)', min: 2, max: 6, step: 1, show: () => vm === 'geometric' },
        { key: 'hexSize', type: 'slider', label: 'Wabengröße (0 = Auto nach Spalten)', min: 0, max: 160, step: 4, unit: 'px', show: () => vm === 'geometric' },
        { key: 'hexArc', type: 'toggle', label: 'Bogen beim Scrollen', desc: 'Waben krümmen sich beim Hoch-/Runterscrollen und blenden oben/unten aus.', show: () => vm === 'geometric' },
        { key: 'hexArcIntensity', type: 'slider', label: 'Bogen-Intensität', min: 0, max: 30, step: 1, show: () => vm === 'geometric' && s.hexArc },
        { key: 'hexFadeStart', type: 'slider', label: 'Ausblenden ab Rand', desc: 'Je kleiner, desto früher (weiter innen) blenden die Waben oben/unten aus.', min: 30, max: 95, step: 5, unit: '%', show: () => vm === 'geometric' && s.hexArc },
        { key: 'hexOffsetX', type: 'slider', label: 'Streifen verschieben (horizontal)', desc: 'Ganzen Waben-Streifen nach links/rechts schieben zum Zentrieren.', min: -200, max: 200, step: 5, unit: 'px', show: () => vm === 'geometric' },
        { key: 'sandySide', type: 'segment', label: 'Kleine Bilder', options: [{ value: 'left', label: 'Links' }, { value: 'right', label: 'Rechts' }], show: () => vm === 'sandy' },
        { key: 'handSpread', type: 'slider', label: 'Fächerung', min: 2, max: 16, step: 1, show: () => vm === 'hand' },
        { key: 'handOffsetX', type: 'slider', label: 'Fächer verschieben (horizontal)', desc: 'Ganzen Kartenfächer nach links/rechts schieben.', min: -200, max: 200, step: 5, unit: 'px', show: () => vm === 'hand' },
        { type: 'custom', customId: 'presets' },
      ],
    },
    // Erscheinungsbild
    {
      title: 'Erscheinungsbild', category: 'Darstellung',
      defs: [
        { key: 'themeMode', type: 'segment', label: 'Modus', options: [{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Hell' }, { value: 'dark', label: 'Dunkel' }] },
        { key: 'schemeCharacter', type: 'segment', label: 'Farbcharakter', options: opt(SCHEME_CHARACTERS) },
        { key: 'finish', type: 'segment', label: 'Finish', options: opt(FINISHES) },
        { key: 'paletteBehaviour', type: 'segment', label: 'Palette', options: [{ value: 'follow', label: 'Wallpaper folgen' }, { value: 'fixed', label: 'Feste Farbe' }, { value: 'keep', label: 'Beibehalten' }] },
        { key: 'fixedSeed', type: 'color', label: 'Feste Farbe', show: () => s.paletteBehaviour === 'fixed' },
        { key: 'themeContrast', type: 'slider', label: 'Kontrast', min: -1, max: 1, step: 0.1 },
        { key: 'uiScale', type: 'slider', label: 'UI-Größe', min: 0.5, max: 2, step: 0.05, unit: '×' },
        { type: 'custom', customId: 'themePresets' },
      ],
    },
    // Wallpaper
    {
      title: 'Wallpaper', category: 'Darstellung',
      defs: [
        { key: 'fillMode', type: 'segment', label: 'Anpassung', options: opt(FILL_MODES) },
        { key: 'dim', type: 'slider', label: 'Abdunkeln', min: 0, max: 0.85, step: 0.05 },
        { key: 'autoRecolour', type: 'toggle', label: 'Neue Wallpaper auto-umfärben', desc: 'Beim Hinzufügen eine umgefärbte Kopie speichern.' },
        { key: 'recolourPalette', type: 'select', label: 'Umfärb-Palette', options: opt(RECOLOUR_PALETTES), show: () => s.autoRecolour },
      ],
    },
    // Video
    {
      title: 'Video', category: 'Darstellung',
      defs: [
        { key: 'muteVideo', type: 'toggle', label: 'Video stummschalten' },
        { key: 'videoVolume', type: 'slider', label: 'Lautstärke', min: 0, max: 100, step: 5, unit: '%', show: () => !s.muteVideo },
      ],
    },
    // Kacheln
    {
      title: 'Kacheln', category: 'Darstellung',
      defs: [
        { key: 'tileSize', type: 'slider', label: 'Größe', min: 80, max: 240, step: 10, unit: 'px' },
        { key: 'tileRadius', type: 'slider', label: 'Eckenradius', min: 0, max: 28, step: 2, unit: 'px' },
      ],
    },
    // Übergang
    {
      title: 'Übergang beim Wechsel', category: 'Darstellung',
      defs: [
        { key: 'transitionType', type: 'segment', label: 'Animation', options: opt(TRANSITIONS), show: () => !s.randomShader },
        { key: 'randomShader', type: 'toggle', label: 'Zufalls-Shader pro Wechsel', desc: 'Jedes Mal ein anderer GPU-Übergang.' },
        { key: 'transitionMs', type: 'slider', label: 'Dauer', min: 150, max: 2000, step: 50, unit: 'ms' },
      ],
    },
    // Automatischer Wechsel
    {
      title: 'Automatischer Wechsel', category: 'Automatik',
      defs: [
        { key: 'randomEnabled', type: 'toggle', label: 'Wallpaper automatisch wechseln' },
        { key: 'randomIntervalSec', type: 'slider', label: 'Intervall', min: 10, max: 3600, step: 10, unit: 's', show: () => s.randomEnabled },
        { key: 'randomFavOnly', type: 'toggle', label: 'Nur Favoriten', show: () => s.randomEnabled },
        { key: 'includeImages', type: 'toggle', label: 'Bilder einschließen', show: () => s.randomEnabled },
        { key: 'includeVideos', type: 'toggle', label: 'Videos einschließen', show: () => s.randomEnabled },
        { type: 'custom', customId: 'osTargets', show: () => s.randomEnabled && native && s.deviceMobile && !s.liveWallpaper },
      ],
    },
    // Zeitplan
    {
      title: 'Zeitplan', category: 'Automatik',
      defs: [
        { key: 'scheduleEnabled', type: 'toggle', label: 'Wallpaper nach Uhrzeit wechseln' },
        { type: 'custom', customId: 'schedule', show: () => s.scheduleEnabled },
      ],
    },
    // Verhalten
    {
      title: 'Verhalten', category: 'Verhalten',
      defs: [
        { key: 'closeOnSelection', type: 'toggle', label: 'Beim Antippen schließen', desc: 'Picker schließt sich, sobald ein Wallpaper gewählt wird.' },
        { key: 'alwaysFilterBar', type: 'toggle', label: 'Filterleiste immer zeigen' },
        { key: 'alwaysSearchBar', type: 'toggle', label: 'Suchleiste immer zeigen' },
      ],
    },
    // Wallhaven
    {
      title: 'Wallhaven', category: 'Quellen',
      defs: [
        { key: 'whColumns', type: 'slider', label: 'Spalten', min: 2, max: 6, step: 1 },
        { key: 'whApiKey', type: 'text', label: 'API-Key (für NSFW)', placeholder: 'Wallhaven API-Key' },
      ],
    },
    // KI (nur Anschluss — Tagging-Backend folgt)
    {
      title: 'KI', category: 'Quellen',
      defs: [
        { key: 'aiEnabled', type: 'toggle', label: 'KI anschließen', desc: 'Später: automatisches Tagging. Vorerst nur die Verbindungsdaten.' },
        { key: 'aiEndpoint', type: 'text', label: 'Endpunkt', placeholder: 'http://localhost:11434', show: () => s.aiEnabled },
        { key: 'aiModel', type: 'text', label: 'Modell', placeholder: 'z. B. llava / wd14-tagger', show: () => s.aiEnabled },
        { key: 'aiApiKey', type: 'text', label: 'API-Key (optional)', placeholder: 'falls nötig', show: () => s.aiEnabled },
        { type: 'custom', customId: 'aiNote', show: () => s.aiEnabled },
      ],
    },
    // Speicherort / Pfade
    {
      title: 'Ordner', category: 'Quellen',
      defs: [
        { type: 'custom', customId: 'folders' },
      ],
    },
    {
      title: 'Speicherort', category: 'Quellen',
      defs: [
        { key: 'wallpaperDir', type: 'text', label: 'Wallpaper-Ordner', placeholder: 'Standard (App-Speicher)' },
        { key: 'videoDir', type: 'text', label: 'Video-Wallpaper-Ordner', placeholder: 'Standard = Wallpaper-Ordner' },
        { type: 'custom', customId: 'pathsNote' },
      ],
    },
    // Menü
    {
      title: 'Menü', category: 'Verhalten',
      defs: [
        { key: 'menuSide', type: 'segment', label: 'Seite', options: [{ value: 'left', label: 'Links' }, { value: 'right', label: 'Rechts' }] },
        { key: 'menuMode', type: 'segment', label: 'Verhalten', options: [{ value: 'auto', label: 'Ausblenden' }, { value: 'pinned', label: 'Fest' }] },
        { key: 'autoHideMs', type: 'slider', label: 'Ausblenden nach', min: 500, max: 10000, step: 500, unit: 'ms', show: () => s.menuMode !== 'pinned' },
      ],
    },
    // Papierkorb
    {
      title: 'Papierkorb', category: 'Daten',
      defs: [
        { key: 'trashAutoDelete', type: 'toggle', label: 'Automatisch endgültig löschen' },
        { key: 'trashRetentionDays', type: 'slider', label: 'Aufbewahrung', min: 1, max: 90, step: 1, unit: ' Tage', show: () => s.trashAutoDelete },
        { type: 'custom', customId: 'trash' },
      ],
    },
  ]);

  const schema: SettingsSchema = {
    get sections() {
      return sections;
    },
    get(key: string) {
      if (key === 'themeMode') return themeMode.value;
      return (s as unknown as Record<string, unknown>)[key];
    },
    set(key: string, value: unknown) {
      if (key === 'themeMode') {
        app.theme.setMode(value as 'auto' | 'light' | 'dark');
        return;
      }
      manager.setField(key, value);
    },
  };

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

<SettingsView {schema} custom={{ live, presets, themePresets, osTargets, schedule, trash, aiNote, pathsNote, folders }} />

{#snippet live()}
  {#if liveActive === true}<p class="hint ok">✓ „SKWD Wall" ist als Live-Wallpaper aktiv.</p>
  {:else if liveActive === false}<p class="hint warn">⚠ Nicht aktiv (Neuinstallation setzt das zurück). Unten neu auswählen.</p>{/if}
  <button class="btn primary" onclick={() => openLiveWallpaperPicker()}>Als Handy-Hintergrund aktivieren…</button>
{/snippet}

{#snippet presets()}
  <div class="chips">
    {#each [0, 1, 2, 3] as i (i)}
      <span class="preset">
        <button class="preset-apply" class:empty={!s.geometryPresets[i]} onclick={() => (s.geometryPresets[i] ? manager.applyGeometryPreset(i) : manager.saveGeometryPreset(i))}>C{i + 1}</button>
        {#if s.geometryPresets[i]}<button class="preset-x" onclick={() => manager.clearGeometryPreset(i)} aria-label="Preset löschen">×</button>{/if}
      </span>
    {/each}
    <span class="hint">Leeres C = aktuelle Geometrie speichern · gefülltes = anwenden · × löscht.</span>
  </div>
{/snippet}

{#snippet themePresets()}
  {#if s.themePresets.length}
    <div class="chips">
      {#each s.themePresets as p (p.id)}
        <span class="preset">
          <button class="preset-apply" onclick={() => manager.applyThemePreset(p.id)}>{p.name}</button>
          <button class="preset-x" onclick={() => manager.deleteThemePreset(p.id)} aria-label="Preset löschen">×</button>
        </span>
      {/each}
    </div>
  {/if}
  <div class="row-inputs">
    <input class="ti" bind:value={presetName} placeholder="Theme speichern als…" spellcheck="false"
      onkeydown={(e) => { if (e.key === 'Enter' && presetName.trim()) { manager.saveThemePreset(presetName.trim()); presetName = ''; } }} />
    <button class="btn" onclick={() => { if (presetName.trim()) { manager.saveThemePreset(presetName.trim()); presetName = ''; } }}>Speichern</button>
  </div>
  <div class="row-inputs">
    <button class="btn" onclick={doExport}>Exportieren</button>
    <button class="btn" onclick={() => (importOpen = !importOpen)}>Importieren</button>
  </div>
  {#if exportText}<textarea class="ta" readonly rows="3">{exportText}</textarea>{/if}
  {#if importOpen}
    <textarea class="ta" bind:value={importText} rows="3" placeholder="Presets-JSON einfügen…"></textarea>
    <button class="btn" onclick={doImport}>Import bestätigen</button>
    {#if importMsg}<p class="hint">{importMsg}</p>{/if}
  {/if}
{/snippet}

{#snippet osTargets()}
  <div class="chips">
    <button class="chip" class:on={s.randomSetHome} onclick={() => manager.setField('randomSetHome', !s.randomSetHome)}>🏠 Startbildschirm</button>
    <button class="chip" class:on={s.randomSetLock} onclick={() => manager.setField('randomSetLock', !s.randomSetLock)}>🔒 Sperrbildschirm</button>
  </div>
{/snippet}

{#snippet schedule()}
  {#each s.schedule as rule (rule.id)}
    {@const img = s.items.find((i) => i.id === rule.targetId)}
    <div class="sched">
      <input type="time" value={rule.time} oninput={(e) => manager.updateScheduleRule(rule.id, { time: (e.target as HTMLInputElement).value })} />
      <select onchange={(e) => { const v = (e.target as HTMLSelectElement).value as 'random' | 'collection' | 'item'; manager.updateScheduleRule(rule.id, { targetType: v, targetId: v === 'random' ? undefined : rule.targetId }); }}>
        <option value="random" selected={rule.targetType === 'random'}>🎲 Zufällig</option>
        <option value="collection" selected={rule.targetType === 'collection'}>📁 Sammlung</option>
        <option value="item" selected={rule.targetType === 'item'}>🖼 Bild</option>
      </select>
      {#if rule.targetType === 'collection'}
        <select onchange={(e) => manager.updateScheduleRule(rule.id, { targetId: (e.target as HTMLSelectElement).value })}>
          <option value="" disabled selected={!rule.targetId}>Sammlung…</option>
          {#each s.collections as c (c.id)}<option value={c.id} selected={rule.targetId === c.id}>{c.name}</option>{/each}
        </select>
      {:else if rule.targetType === 'item'}
        <button class="sched-pick" onclick={() => (pickerRuleId = rule.id)}>
          {#if img}<span class="thumb" style={urls.value[img.id] ? `background-image:url(${urls.value[img.id]})` : ''}></span>{img.name}{:else}🖼 Bild wählen{/if}
        </button>
      {/if}
      <button class="sched-x" onclick={() => manager.removeScheduleRule(rule.id)} aria-label="Regel löschen">×</button>
    </div>
  {/each}
  <button class="btn" onclick={() => manager.addScheduleRule()}>＋ Regel hinzufügen</button>
{/snippet}

{#snippet trash()}
  {#if s.trashedItems.length === 0}
    <p class="hint">Papierkorb ist leer.</p>
  {:else}
    <div class="trash-grid">
      {#each s.trashedItems as t (t.id)}
        <div class="trash-item">
          <span class="thumb big" style={urls.value[t.id] ? `background-image:url(${urls.value[t.id]})` : ''}></span>
          <span class="tn">{t.name}</span>
          <div class="trash-actions">
            <button class="btn sm" onclick={() => manager.restoreFromTrash(t.id)}>Wiederherstellen</button>
            <button class="btn sm danger" onclick={() => manager.purgeFromTrash(t.id)}>Löschen</button>
          </div>
        </div>
      {/each}
    </div>
    <button class="btn danger" onclick={() => manager.emptyTrash()}>Papierkorb leeren</button>
  {/if}
{/snippet}

{#snippet aiNote()}
  <p class="hint">Nur die Verbindung — das eigentliche KI-Tagging (für Anime am besten ein WD14-/DeepDanbooru-Tagger) kommt als eigener Block.</p>
{/snippet}

{#snippet pathsNote()}
  <p class="hint">Leer = App-Speicher (Standard). Native Gerät-Pfade (Android-Ordner direkt beschreiben) kommen als nativer Block; die Pfade werden schon gemerkt.</p>
{/snippet}

{#snippet folders()}
  {#if foldersSupported}
    <p class="hint">Zeig auf einen echten Ordner — die Bilder/Videos erscheinen in der Galerie, <strong>ohne hochzuladen</strong> (Dateien bleiben im Ordner).</p>
    <div class="chips">
      <button class="btn" disabled={folderBusy} onclick={() => addFolderSrc('image')}>＋ Bilder-Ordner</button>
      <button class="btn" disabled={folderBusy} onclick={() => addFolderSrc('video')}>＋ Video-Ordner</button>
    </div>
    {#if folderMsg}<p class="hint ok">{folderMsg}</p>{/if}
    {#if s.folders.length}
      <div class="folder-list">
        {#each s.folders as f (f.id)}
          <div class="folder-row">
            <div class="folder-meta">
              <span class="folder-name">{f.name}</span>
              <span class="folder-sub">{f.kind === 'video' ? 'Videos' : 'Bilder'} · {f.count}{#if !f.connected} · getrennt{/if}</span>
            </div>
            {#if !f.connected}
              <button class="btn" disabled={folderBusy} onclick={reconnectFolders}>Verbinden</button>
            {/if}
            <button class="btn danger" disabled={folderBusy} onclick={() => manager.removeFolder(f.id)}>Entfernen</button>
          </div>
        {/each}
      </div>
      {#if s.folders.some((f) => !f.connected)}
        <p class="hint warn">Nach einem Neustart muss der Ordner-Zugriff einmal neu bestätigt werden („Verbinden").</p>
      {/if}
    {/if}
  {:else}
    <p class="hint">Direkter Ordner-Zugriff geht in diesem Browser nicht. Am PC (Chrome/Edge) kannst du Ordner direkt einbinden; auf dem Handy kommt der native Ordner-Zugriff (SAF) als eigener Block. Bis dahin: <strong>Hochladen</strong> nutzen.</p>
  {/if}
{/snippet}

{#if pickerRuleId}
  <ImagePicker {manager} title="Bild für Zeitplan wählen" onpick={onPickImage} onclose={() => (pickerRuleId = null)} />
{/if}

<style>
  .hint { margin: 0; font-size: 0.78rem; color: var(--text-faint); line-height: 1.4; }
  .ok { color: #46a758; }
  .warn { color: #f5a524; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .chip { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.82rem; }
  .chip.on { background: var(--color-primary); color: #fff; border-color: transparent; }
  .preset { display: inline-flex; align-items: stretch; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
  .preset-apply { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: none; color: var(--text); font-size: 0.82rem; }
  .preset-apply.empty { color: var(--text-faint); border-style: dashed; }
  .preset-x { padding: 0 8px; background: var(--bg-elevated); border: none; border-left: 1px solid var(--border); color: var(--text-muted); }
  .btn { padding: var(--space-2) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; white-space: nowrap; }
  .btn.primary { background: var(--color-primary); border: none; color: #fff; font-weight: 600; align-self: flex-start; }
  .btn.sm { padding: 4px 8px; font-size: 0.78rem; }
  .btn.danger { color: #e5484d; }
  .btn:disabled { opacity: 0.5; }
  .folder-list { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
  .folder-row { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .folder-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .folder-name { font-size: 0.88rem; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .folder-sub { font-size: 0.74rem; color: var(--text-faint); }
  .row-inputs { display: flex; gap: var(--space-2); }
  .ti { flex: 1; min-width: 0; padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; }
  .ta { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-family: var(--font-mono); font-size: 0.75rem; padding: var(--space-2); resize: vertical; }
  .sched { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .sched input[type='time'], .sched select { padding: var(--space-2); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; }
  .sched-pick { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 5px var(--space-2); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 0.85rem; text-align: left; }
  .sched-x { width: 30px; height: 30px; border-radius: var(--radius-md); background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
  .thumb { flex: 0 0 auto; width: 26px; height: 26px; border-radius: var(--radius-sm); background-size: cover; background-position: center; background-color: var(--color-surface-variant); }
  .trash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-3); }
  .trash-item { display: flex; flex-direction: column; gap: 4px; }
  .thumb.big { width: 100%; height: 80px; border-radius: var(--radius-md); }
  .tn { font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trash-actions { display: flex; gap: 4px; }
</style>
