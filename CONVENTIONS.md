# Orbit — Konventionen & Standards

Verbindliche Muster für den Bau. Kurz, regelbasiert (für Mensch **und** KI).

## Grundprinzip

- **Alles ist ein Plugin.** Der Kern (`src/core`) kennt keine Features — er lädt
  Plugins, öffnet ihre Views, routet Commands/Config/Theme. Features leben in
  `src/plugins/<id>/`.
- **Eine Codebasis, dünne Plattform-Ränder.** Kein Ordner pro Betriebssystem.
  Plattform-spezifisches nur hinter Adaptern in `src/platform/`, gegatet über
  `isNativeApp()` / `app.platform`.

## Ordnerstruktur

```
src/
  core/      Kern/Plugin-API (app, loader, config, commands, workspace, theme, store, platform, types)
  shell/     sichtbarer Rahmen (Shell, Sidebar, Tabs, ViewHost, Settings, CommandPalette, Icon)
  platform/  dünne native Adapter (z. B. wallpaper.ts: Web-/Native-Zweige)
  plugins/   ein Ordner pro Plugin; _template/ = Vorlage
  styles/    Basis-Tokens (Farben/Abstände als CSS-Vars)
  main.ts    registriert die Plugins + bootet
```

## Ein Plugin bauen

1. `src/plugins/_template/` kopieren nach `src/plugins/<id>/`.
2. `manifest` setzen: `id` (kebab-case, **stabil** — ist der Config-Key!),
   `name`, `platforms`.
3. In `src/main.ts` importieren + in `modules` eintragen (Phase 1: statisch;
   GitHub-Store folgt).
4. UI = Svelte-Komponente, im `View.onOpen()` per `mount(...)` einhängen
   (Vorbild: `src/plugins/skwd-wall/index.ts`).

## Einstellungen / State (das wichtigste Muster)

Einstellungen sind **deklarativ** — Orbit-Standard. Nicht pro Feld Svelte-Markup
bauen, sondern drei Schichten:

1. **Typ + Default** in `types.ts` (ein Feld in `*State` + `DEFAULT_STATE`).
2. **Schema-Eintrag** in `*Settings.svelte`: ein `SettingDef` (`src/core/settings.ts`)
   vom Typ `toggle | slider | segment | select | text | color | button | heading |
   custom`, gruppiert in `SettingSection` (optional `category` → Reiter). Gerendert
   vom generischen `src/shell/SettingsView.svelte` (Kategorie-Reiter, scroll-sicherer
   Eigen-Slider nur auf horizontales Ziehen, 320 ms Settle-Guard gegen Fehl-Taps).
3. **Schreiben** über den generischen `manager.setField(key, value)` (persistiert +
   führt Seiteneffekte per `switch` aus). Echte Sonderfälle (Presets, Papierkorb,
   Ordner-Liste …) als `custom`-Snippet via `custom={{ … }}`.

- Lesen in Settings/Views: `const st = useStore(manager.state)`. Nie State direkt mutieren.
- Persistenz: `app.config.set(PLUGIN_ID, 'state', …)` (localStorage). Bild-/Blob-
  Daten in IndexedDB (`storage.ts`), nicht in Config.
- **Migration:** wird ein `id`/Key umbenannt, in `main.ts`/Konstruktor alten Config-Key
  auf neuen umziehen (siehe `wallpaper`→`skwd-wall`), sonst gehen Nutzerdaten verloren.

## Speicher / Medien

- **IndexedDB** (`storage.ts`): hochgeladene Bild-/Video-Blobs, per Item-id.
- **Externe Ordner** (`folders.ts`): echte Verzeichnisse referenziert (nicht kopiert).
  Web = File System Access API (`showDirectoryPicker`, Handle in IDB, Re-Permission
  nach Reload); nativ = `FolderAccess`-Plugin (SAF, Dauerberechtigung).
- **Thumbnails**: Galerie zeigt kleine, heruntergerechnete Bilder (`folderThumbUrl`;
  nativ `inSampleSize`, Web `createImageBitmap`); **Anwenden** (System-/Live-
  Wallpaper) nutzt volle Auflösung (`manager.fullUrl`, frischer Object-URL → Caller
  revoked). Laden ist **faul**: `use:ensure` (IntersectionObserver) lädt nur sichtbare
  Items, `releaseUrl` gibt sie außer Sicht wieder frei → beschränkter Speicher.

## Reaktivität (Svelte 5)

- Core-Stores → Runes über `useStore(store)` aus `@shell/reactive.svelte`.
- Runes: `$state`, `$derived`, `$derived.by`, `$effect`, `$props`.

## Native / Plattform

- Bridge-Funktionen in `src/platform/*.ts`; Aufrufer gaten mit `isNativeApp()`.
- **Nie** große Medien als base64 über die Capacitor-Bridge (friert den Thread
  ein → ANR). Bilder vorher runterskalieren; große Dateien gechunkt übertragen;
  Thumbnails nativ heruntersampeln.
- Android-Code in `android/app/src/main/java/space/sternenhof/wallpaper/`
  (`WallpaperPlugin`, `FolderAccessPlugin`), registriert in `MainActivity`.
  Nach nativen Änderungen: APK neu bauen; nach reinen Web-Änderungen reicht
  App-Reload (Dev-APK lädt vom Vite-Server).
- **Native Fähigkeiten gehören in den Kern, nicht ins Plugin.** Nativer Code lässt
  sich nicht als Plugin herunterladen → er lebt im Kern-APK und wird als
  **generische Capability** (Datei/Ordner, Wallpaper, Live-Wallpaper) angeboten,
  die jedes Plugin über die Kern-API nutzen kann. (Beim Kern-Umbau: skwd-wall von
  den aktuell direkt genutzten nativen Plugins auf eine saubere Kern-Capability-API
  umstellen.)

## Qualität

- `npm run check` (0 Fehler) **und** `npm run build` (grün) vor jedem Abschluss.
- Benennung: Dateien/Ordner kebab-case bzw. Komponenten PascalCase; IDs kebab-case.
- Kommentare erklären das *Warum*, nicht das Offensichtliche.
