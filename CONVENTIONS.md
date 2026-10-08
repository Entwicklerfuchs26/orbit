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

Immer diese drei Schichten, reaktiv:

1. **Typ + Default** in `types.ts` (ein Feld in `*State` + `DEFAULT_STATE`).
2. **Setter** im `manager.ts`: `set…(v) { this.state.update(s => ({...s, feld:v})); this.persist(); /* ggf. apply */ }`.
3. **UI** in `*Settings.svelte`: `const st = useStore(manager.state)` lesen,
   `manager.set…(v)` schreiben. Nie State direkt mutieren.

- Persistenz: `app.config.set(PLUGIN_ID, 'state', …)` (localStorage). Bild-/Blob-
  Daten in IndexedDB (`storage.ts`), nicht in Config.
- **Migration:** wird ein `id`/Key umbenannt, in `main.ts` alten Config-Key auf
  neuen umziehen (siehe `wallpaper`→`skwd-wall`), sonst gehen Nutzerdaten verloren.

## Reaktivität (Svelte 5)

- Core-Stores → Runes über `useStore(store)` aus `@shell/reactive.svelte`.
- Runes: `$state`, `$derived`, `$derived.by`, `$effect`, `$props`.

## Native / Plattform

- Bridge-Funktionen in `src/platform/*.ts`; Aufrufer gaten mit `isNativeApp()`.
- **Nie** große Medien als base64 über die Capacitor-Bridge (friert den Thread
  ein → ANR). Bilder vorher runterskalieren; große Dateien gechunkt übertragen.
- Android-Code in `android/app/src/main/java/space/sternenhof/wallpaper/`.
  Nach nativen Änderungen: APK neu bauen; nach reinen Web-Änderungen reicht
  App-Reload (Dev-APK lädt vom Vite-Server).

## Qualität

- `npm run check` (0 Fehler) **und** `npm run build` (grün) vor jedem Abschluss.
- Benennung: Dateien/Ordner kebab-case bzw. Komponenten PascalCase; IDs kebab-case.
- Kommentare erklären das *Warum*, nicht das Offensichtliche.
