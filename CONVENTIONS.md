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

## Einrichtungs-/Onboarding-Dialoge (Design-Standard)

Alle Einstiegs-/Einrichtungsdialoge sehen gleich aus und fühlen sich gleich an –
Orbit-Einstieg (`src/shell/Onboarding.svelte`) und Plugin-Einstiege (Vorbild
`src/plugins/skwd-wall/Intro.svelte`). Neue Dialoge kopieren dieses Muster.

**Aufbau.** Vollbild: `position: fixed; inset: 0` (Orbit-Onboarding `z-index: 950`;
Plugin-Intro in der View `z-index: 80`). Safe-Area beachten:
`padding: calc(env(safe-area-inset-top) + …) … calc(env(safe-area-inset-bottom) + …)`.
Zentrierte „stage" (`max-width: ~560px`), darin Illustration → Copy → Footer.

**Hintergrund.** `radial-gradient(… color-mix(--accent 22%, transparent) …)` über
`var(--bg)`, plus zwei weich geblurrte „aurora"-Blobs (`.a1`/`.a2`), die langsam
driften (`@keyframes drift1/drift2`). Keine harten Flächen.

**Illustrationen = eigene Inline-SVGs, KEINE Emojis.** viewBox ~`260×210`. Füllungen
über eine gemeinsame `<linearGradient id="…Grad">` (Stop 0 `var(--accent)` → Stop 1
`color-mix(--accent 55%, #b06cf0)`); Striche/Flächen via `color-mix` auf `--text`/
`--accent`, damit sie in Hell/Dunkel sitzen. Dezente Animationen: `float` (sanftes
Heben), `spin` (Orbit-Ringe), `pop` (Einblenden mit Scale), `dashmove` (laufende
Linien), `wave`, `slidein`, `draw` (Stroke-Dash). Interaktive Schritte dürfen die
Illustration mit `{#key wert}` + `in:fade` live wechseln (z. B. Ansichts-Vorschau).

**Schritte & Transitions.** Pro Schritt `{#key i}`: Illustration `in:fade`
(~420 ms), Copy `in:fly={{ y: 16, easing: cubicOut }}`. Fortschrittspunkte unten
(aktiv = zum Pill verlängert, `--accent`). Copy-Hierarchie: `kicker` (uppercase,
`--accent`, `NN · Label`), `h1` (`clamp(...)`, `font-weight: 800`,
`letter-spacing: -0.02em`), `p` (`--text-muted`, `max-width: ~32rem`, `line-height: 1.6`).

**Bedienelemente** (wirken sofort auf den State): Schalter = iOS-Stil (Track 46×28,
Knopf 22, `--accent` wenn an); Mehrfachauswahl = Chip-Raster (Pillen, gewählt =
`--accent`-Fläche); größere Auswahl = Options-/Choice-Karten. Kein natives `<select>`
in diesen Dialogen.

**Footer.** `ghost` (Zurück) + primärer `go`-Button (Verlauf `--accent`→Violett,
weicher Schatten; am Handy voll breit). Letzter Schritt: „Loslegen"/„Los geht's".

**Barrierefreiheit & Theme.** Alles über Tokens (`--accent`, `--text`, `--bg`,
`--bg-elevated`, `--border`, `color-mix`) → Hell/Dunkel automatisch.
`@media (prefers-reduced-motion: reduce)` schaltet ALLE Animationen aus und zeigt
Endzustände.

**Verhalten.** Plattformnahe Plugin-Intros sind **Handy-only** (`app.platform.isMobile`)
und erscheinen **einmal** (persistiertes Flag, z. B. `introSeen`). Erneut zeigbar
über einen Command `"<id>:show-intro"` (vom Plugins-Bereich + Plugin-Einstellungen
angeboten) bzw. für den Orbit-Einstieg über Einstellungen → Einstieg. Der Orbit-
Einstieg markiert sich beim Erscheinen als gesehen (`core.onboarded`), nervt also nie.
Ein Intro, das in eine frisch geöffnete View gemountet wird, wartet per
`requestAnimationFrame` auf `containerEl` (der ViewHost setzt ihn erst im nächsten
Tick) – sonst leerer Tab.

## Plugin-Verteilung / Store

- Veröffentlichen NUR über `node scripts/publish-plugins.mjs <klon-von-orbit-plugins>`:
  baut die Plugins, committet sie, **pinnt `registry.json` auf den Commit-SHA**
  (unveränderliche URLs → GitHub/CDN liefert nie veraltet) und pflegt die
  Versionshistorie (`versions[]` für Rollback). `news[]` im Manifest = Changelog für
  die Detailseite.
- Remote-Laden: `loader.loadFromUrl` holt den Quelltext per `fetch(cache:'no-store')`
  und importiert ihn über eine **Blob-URL** (umgeht raw-MIME + Browser-Cache). Plugins
  binden an `globalThis.Orbit` (Laufzeit-Shim), werden gegen `@core` als „external"
  gebaut (`vite.plugin.config.ts`).

## Qualität

- `npm run check` (0 Fehler) **und** `npm run build` (grün) vor jedem Abschluss.
- Benennung: Dateien/Ordner kebab-case bzw. Komponenten PascalCase; IDs kebab-case.
- Kommentare erklären das *Warum*, nicht das Offensichtliche.
