# Architektur — KI-Betriebssystem

## Idee in einem Satz

Ein universeller Plugin-Loader für KI-Anwendungen — wie NixOS, aber für GUIs.
Der Kern kann nichts außer Plugins laden. Alles andere (Chat, Notizen, Themes,
Nextcloud, Projektmanagement, Avatar) sind Plugins.

> **Hinweis:** Dieses Dokument beschreibt die **Vision**. Der real gebaute Stand
> steht in Abschnitt 0. Wo Vision und Ist abweichen, gilt für die Bauarbeit das Ist
> + `CONVENTIONS.md`.

---

## 0.1 Verbindliche Entscheidungen (09.10.2026)

1. **Launcher-Modus: JA (Ziel).** Orbit wird (auch) der **Android-Homescreen/
   Launcher**: überall dasselbe, sich anpassendes Theme, nativer KI-Chat + viele
   Features direkt im Launcher (Vision: z. B. Obsidian eingebaut). Nur als Launcher
   sind Homescreen-Gesten („Kreis zeichnen → Plugin öffnet") möglich. Muss nicht
   zuerst gebaut werden, aber Kern (Navigation, Einstiegspunkte, Gesten-Hooks) wird
   so angelegt, dass der Launcher später sauber andockt.
2. **Kern-Aufteilung: universeller Kern + plattformspezifische Kern-Teile.** Ein
   plattformunabhängiger Kern (überall identisch) PLUS pro Plattform nur die dort
   sinnvollen Capability-Implementierungen (Android-APIs nur in der Android-App, iOS
   nur iOS, Desktop/Web eigene). macOS schleppt keine Android-APIs mit. Plugins
   fragen Capabilities über die Kern-API ab (`hasCapability('folders')`…) und
   deklarieren benötigte Plattformen/Capabilities.
3. **Plugin-Store: kein gehosteter Upload-Server (vorerst), aber quellen-
   abstrahiert (09.10.2026 präzisiert).** Eigener Bereich **„Plugins"** als eigener
   Punkt neben den Orbit-Einstellungen. Funktionen: Plugins installieren + updaten;
   pro Plugin **Screenshots**, Beschreibung, Download-/Aufruf-Zahlen (wenn machbar),
   **Zielplattform** (welches OS/Handy). **Mechanismus = Option 3 (beides):** eine
   kuratierte **Manifest-Liste** (GitHub-JSON, Jonas pflegt) für den durchsuchbaren
   Store PLUS ein **Direkt-GitHub-Link**-Feld für eigene/Test-Plugins. Kein eigener
   Upload-/Mietserver. **Die Plugin-Quelle ist abstrahiert (`PluginSource`), damit
   später per Update eine echte Orbit-Webseite als weitere Quelle dazukommt** —
   eine Seite, auf der man Plugins auch OHNE installiertes Orbit ansehen (und
   irgendwann kaufen) kann. **APK bringt KEIN Feature-Plugin mit**; man lädt sie erst
   aus dem Plugins-Bereich.
4. **Eingebaute Plugins raus, nur ein Start-Plugin bleibt (09.10.2026).** Die bisher
   statisch eingebauten Feature-Plugins (SKWD Wall, Design, Welcome-Demo) werden aus
   dem Kern-APK herausgelöst und wandern in den Store (eigene Repos/Katalog-Einträge).
   Fest im APK bleibt höchstens ein **Start-/Willkommens-Plugin**, das Orbit erklärt
   (Onboarding/„Startmenü") — und das ist **deinstallierbar**. Voraussetzung dafür ist
   der funktionierende Nachlade-Weg (Punkt 5), sonst Henne-Ei: erst Remote-Laden
   solide, dann eingebaute Plugins entfernen.
5. **Remote-Laden fremd-gebauter Plugins (technische Kern-Hürde).** Der Kern muss
   extern gebaute Plugins zur Laufzeit laden (ESM-`import` der ausgelieferten
   `main.js`) UND ihnen die **Kern-API zur Laufzeit** bereitstellen (globaler
   Orbit-API-Shim), damit ein Plugin NICHT seine eigene Kopie des Kerns mitschleppt.
   Plugins werden gegen die Kern-API als „external" gebaut. Das ist das eigentliche
   Stück Arbeit von Block 4/5.
6. **Deklarative Plugin-Verwaltung am PC (NixOS/Home-Manager): angestrebt.** Kleine
   Config-Quellen-Abstraktion (localStorage-Default + Datei `~/.config/orbit/
   config.json`), die ein Home-Manager-Modul schreiben kann.

## 0. Ist-Zustand (Stand 09.10.2026)

- **Stack entschieden:** TypeScript + **Svelte 5** (Runes) + Vite 6, Mobile via
  **Capacitor 8** (Android live), Desktop (Tauri) vorgesehen.
- **Kern** (`src/core`): Plugin-Loader, deklarative Config (localStorage), Commands,
  Workspace/Tabs, Theme (Material You), Store/Reaktivität, **Settings-Framework**
  (`settings.ts` + `shell/SettingsView.svelte`, Kategorie-Reiter).
- **Shell** (`src/shell`): Sidebar, Tabs, ViewHost, Kommandopalette, Settings.
- **Erstes Plugin `skwd-wall`: feature-komplett** (ohne Sync) — 7 Ansichtsmodi aus
  dem SKWD-Quellcode adaptiert, Theming, Hinzufügen per Upload/Wallhaven/**Ordner**
  (nativ SAF + Web FS-Access, mit Thumbnails + faulem Laden), System- +
  Live-Wallpaper (nativer GL-Dienst), Papierkorb, Zeitplan, Auto-Wechsel.
- **Native Capabilities im Kern-APK:** `WallpaperPlugin` (statisch + GL-Live) und
  `FolderAccessPlugin` (SAF). Grundsatz: nativer Code ist nicht downloadbar → er
  gehört in den Kern und wird als generische Capability für alle Plugins angeboten.
- **Capability-API (Kern-Phase Block 1, erledigt):** `app.capabilities` — eine
  typisierte Registry mit Verträgen `folders` / `wallpaper` / `live-wallpaper`
  (`src/core/capabilities.ts`). Implementierungen liegen plattformspezifisch in
  `src/platform/` (`folders.ts`, `wallpaper.ts`) und werden beim Boot über
  `installCapabilities(app)` (`src/platform/index.ts`) NUR dort registriert, wo das
  Gerät sie wirklich kann → `has('x')` ist ein ehrlicher Laufzeit-Check, kein
  OS-String-Raten (macOS schleppt keine Android-Wallpaper-API mit). Der Kern bleibt
  plattformfrei; `main.ts` (Composition Root) verdrahtet Plattform → Kern.
  Plugins deklarieren benötigte Capabilities im Manifest (`capabilities: [...]`) und
  degradieren sauber, wo eine fehlt. skwd-wall nutzt ausschließlich diese API.
- **Navigations-API + Startseite (Kern-Phase Block 2, erledigt):** Plugins
  registrieren wie bisher Navigationspunkte/Views/Commands; ein Nav-Item kann sich
  per `isStartPage: true` als Standard-Startseite anbieten
  (`navigation.defaultStartPageId()`). Die effektive Startseite = Nutzerwahl
  (Config `core.startPage`) → Plugin-Default → sonst nichts; sie öffnet beim Boot,
  wenn die Sitzung keine Tabs wiederherstellt (`app.resolveStartPageId`). Auswahl in
  Settings → Allgemein → Start (`app.getStartPagePref` / `setStartPagePref`,
  `LAST_SESSION` = Sitzung wiederherstellen). Groundwork für die spätere eigene
  Launcher-Ansicht + Gesten-Hooks.
- **Onboarding (Kern-Phase Block 3, erledigt):** Beim ersten Start (leere Config)
  zeigt die Shell `Onboarding.svelte` — ein Bundle/Plugin-Picker. Bundles sind
  Presets (Plugin-Listen), definiert in `main.ts` (Composition Root, nicht im Kern —
  der Kern nennt nie ein konkretes Plugin), plus „Eigenes" (freie Auswahl).
  Abschluss: `app.completeOnboarding(ids)` aktiviert die Plugins, setzt
  `core.onboarded` und öffnet die Startseite. Kein Auto-Seed mehr; Bestandstester
  werden beim Boot als onboarded markiert. `Bundle`-Typ im Kern (`types.ts`).
- **Plugins-Bereich/Store (Kern-Phase Block 4, Fundament erledigt):** Eigener
  Shell-Bereich `Plugins.svelte` (Sidebar-Punkt neben Einstellungen) mit Tabs
  Installiert/Store. Quellen-Abstraktion `PluginSource` + `PluginStore`
  (`src/core/sources.ts`): kuratierte Manifest-Liste (GitHub-JSON) + Direkt-Link
  (`resolveDirectLink`) heute, spätere Orbit-Webseite als weitere Quelle. Remote-
  Laden via `loader.loadFromUrl` (dynamischer ESM-`import`) gegen den Laufzeit-Shim
  `globalThis.Orbit` (`src/core/runtime.ts`, ABI `ORBIT_API_VERSION`), damit fremd-
  gebaute Plugins die Kern-API teilen statt eine eigene Kopie. Installierte Remote-
  Plugins + Quellen stehen in Config `core.installed`/`core.sources`; Boot lädt
  aktivierte nach (`pluginStore.loadInstalled`). OFFEN: ein extern gebautes
  Beispiel-Plugin zum Beweisen des Pfads; Settings→Plugins ggf. später ausdünnen.
- **Plugin-Externalisierung (Kern-Phase Block 5, Pipeline erledigt):**
  `vite.plugin.config.ts` baut EIN Plugin (`PLUGIN=<id> npm run build:plugin`) als
  eigenständiges ESM (`plugins-dist/<id>/main.js`): nur `@core` ist external und wird
  zur Laufzeit an `globalThis.Orbit` gebunden, alles andere (Svelte-Runtime mit
  `emitCss:false` → Styles im JS, `@shell`, Libraries) wird gebündelt.
  `scripts/assemble-registry.mjs` baut die Store-Plugins (welcome/theme/skwd-wall) und
  erzeugt das Repo-fertige Layout `plugins-dist/registry/` (registry.json + pro Plugin
  main.js/manifest.json) für das **orbit-plugins**-Repo
  (`github.com/Entwicklerfuchs26/orbit-plugins`, raw registry.json ist die Default-
  Quelle; relative `main`-Pfade lösen gegen die registry-URL auf). Verifiziert: alle
  drei Plugins bauen, binden an `globalThis.Orbit`, exportieren manifest+default.
- **Offen / als Nächstes (braucht Gerät + orbit-plugins live):** eingebaute Plugins
  aus `main.ts` entfernen (APK bringt kein Feature-Plugin mit), Onboarding installiert
  dann aus dem Store statt builtins zu aktivieren; **eigenständige APK** (kein
  Dev-Server-Zwang) + **Wallhaven eigenständig** (im skwd-wall-Plugin: nativer Direkt-
  Abruf via CapacitorHttp statt Vite-Proxy); danach PC↔Handy-Sync. Deklarative
  Plugin-Verwaltung auf dem PC (NixOS/Home-Manager) ist angedacht.

## Schichtenmodell

```
┌─────────────────────────────────────────────────────────┐
│                     Plugins                              │
│                                                          │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌──────┐         │
│  │ Chat │ │Notes │ │ NC    │ │ PM   │ │Avatar│  ...     │
│  │ (gui)│ │(gui) │ │(adapt)│ │(adapt│ │(gui) │         │
│  └──────┘ └──────┘ └───────┘ └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐ ┌───────┐                            │
│  │Theme │ │Sync  │ │Multi- │  ...                       │
│  │(theme│ │(tool)│ │User   │                            │
│  └──────┘ └──────┘ │(tool) │                            │
│                     └───────┘                            │
├─────────────────────────────────────────────────────────┤
│                      Kern                                │
│                                                          │
│  Plugin-Loader · Deklarative Config · Minimale Shell     │
│  (Sidebar + Tabs + Kommandopalette)                     │
├─────────────────────────────────────────────────────────┤
│                  Plattform-Shell                         │
│                                                          │
│  Tauri (Desktop) · Capacitor (Mobile) · Browser (Web)    │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Kern

Der Kern ist bewusst minimal. Er kann **drei Dinge**:

### 1.1 Plugins laden
- Liest eine deklarative Config (JSON)
- Lädt die dort aktivierten Plugins
- Gibt jedem Plugin ein API-Objekt (`App`)
- Jedes Plugin ist ein JS-Modul mit `onload()` / `onunload()`
- Folgt Obsidians Plugin-API-Muster (bekanntes Pattern)

### 1.2 Deklarative Konfiguration (NixOS-Prinzip)
Alles steht in einer Config-Datei. Config teilen = System reproduzieren.

```json
{
  "plugins": {
    "chat":      { "enable": true,  "model": "hermes", "voice": true },
    "notes":     { "enable": true,  "vault": "~/second-brain" },
    "nextcloud": { "enable": true,  "url": "https://cloud.example.org" },
    "theme":     { "enable": true,  "set": "aurora", "mode": "dark" },
    "pm":        { "enable": true,  "backend": "openproject" },
    "sync":      { "enable": true,  "target": "peer" },
    "avatar":    { "enable": false },
    "multiuser": { "enable": false }
  }
}
```

`enable: true` → Plugin aktiv. `enable: false` → als wäre es nicht da.

### 1.3 Minimale Shell
- Sidebar: Plugins registrieren hier ihre Menüpunkte
- Tabs / Split Views: Plugins rendern in diese Container
- Kommandopalette (Ctrl+P): Plugins registrieren Commands
- Mehr nicht. Kein eigenes UI, keine eigenen Features.

---

## 2. Plugin-System

### Plugin-Struktur

```
mein-plugin/
├── manifest.json      # Metadaten
├── main.js            # Einstiegspunkt (kompiliert aus TypeScript)
└── styles.css         # Optional: Plugin-eigene Styles
```

```json
// manifest.json
{
  "id": "nextcloud-files",
  "name": "Nextcloud Dateibrowser",
  "version": "1.0.0",
  "description": "Nativer Dateibrowser für Nextcloud",
  "author": "Community",
  "main": "main.js",
  "type": "adapter"
}
```

```typescript
// main.ts
import { Plugin, App } from '@sojus/api';

export default class NextcloudFiles extends Plugin {
  async onload() {
    // Menüpunkt in der Sidebar
    this.addNavigationItem({
      id: 'nc-files',
      name: 'Dateien',
      icon: 'folder',
      view: () => new FileBrowserView(this.app)
    });

    // Command für Kommandopalette
    this.addCommand({
      id: 'open-file-browser',
      name: 'Dateibrowser öffnen',
      callback: () => this.app.workspace.openView('nc-files')
    });

    // Eigene Settings-Sektion
    this.addSettingTab(new NextcloudSettingsTab(this.app, this));
  }

  async onunload() {
    // Aufräumen
  }
}
```

### Plugin-Typen

| Typ       | Beschreibung                                  | Beispiele                          |
|-----------|-----------------------------------------------|------------------------------------|
| `gui`     | Eigene UI/Funktionalität                      | Chat, Notes, Avatar, Kalender      |
| `adapter` | Verbindet ein existierendes Backend            | Nextcloud, OpenProject, Immich     |
| `theme`   | Visuelles Design-Paket                        | Dark Aurora, Catppuccin, Nord      |
| `tool`    | Hintergrund-Funktionalität                    | Sync, Multi-User, Backup, Export   |

### Was Plugins können (API)

Ein Plugin hat über das `App`-Objekt Zugriff auf:

| API                  | Beschreibung                                                  |
|----------------------|---------------------------------------------------------------|
| `app.workspace`      | Tabs öffnen/schließen, Views registrieren, Split Views        |
| `app.vault`          | Second Brain lesen/schreiben (Notizen, Links, Metadaten)      |
| `app.settings`       | Eigene Settings registrieren, Config lesen/schreiben          |
| `app.commands`       | Commands für Kommandopalette registrieren                     |
| `app.notifications`  | Benachrichtigungen senden                                     |
| `app.theme`          | Aktuelle Farben/Tokens lesen, auf Theme-Wechsel reagieren     |
| `app.platform`       | Plattform-Info (desktop/mobile/web), native Features          |

### Plugin-Distribution

| Phase | Mechanismus                                           |
|-------|-------------------------------------------------------|
| MVP   | GitHub-Link eingeben → App downloadt Repo             |
| v2    | Plugin-Registry (JSON auf GitHub, wie Obsidian)       |
| v3    | Eigener Store mit Suche, Bewertungen, Auto-Updates    |

Ein Repo kann mehrere Plugins enthalten (Monorepo mit `plugins.json`).

---

## 3. Preset-Bundles

Weil der Kern alleine nichts kann, gibt es vorkonfigurierte Bundles:

| Bundle             | Enthaltene Plugins                                      |
|--------------------|---------------------------------------------------------|
| **Minimal**        | Chat                                                    |
| **Handy**          | Chat + Theme + Launcher                                 |
| **Desktop**        | Chat + Theme + Notes + Desktop-Integration              |
| **Vollausstattung**| Alles: Chat, Notes, NC, PM, Theme, Avatar, Sync         |
| **Eigenes**        | Frei zusammenstellbar per Config                         |

Bei der Erstinstallation wählt man ein Bundle. Danach frei anpassbar.

---

## 4. Beispiel-Plugins im Detail

### Theme-Plugin (Kern-nah, aber trotzdem Plugin)
- **Set = Wallpaper-Paket + Farbpalette + komplettes Design**
  - Desktop-Wallpaper (16:9) + Handy-Wallpaper (9:16)
  - Farbpalette: automatisch extrahiert (Material You) oder manuell
  - Schriftart + Schriftgröße
  - Cursor-Style (Desktop)
  - Icon-Pack
  - UI-Dichte (kompakt / komfortabel)
  - Animationen (an / aus / reduziert)
  - Hell / Dunkel / Auto
- Set-Editor: Sets erstellen/bearbeiten auf PC und Handy
- Auf Linux: steuert optional auch Desktop (Hyprland, GTK-Theme, Cursor)
- Auf Android: steuert Launcher-Wallpaper und System-Farben
- Inspiration: SKWD Wall (Konzept), Material You (Farbextraktion)

### Sync-Plugin
- Synchronisiert Config + Plugin-Daten zwischen Geräten
- Peer-to-Peer (kein Server nötig) oder eigener Server
- Ohne dieses Plugin: alles rein lokal

### Multi-User-Plugin
- Bringt eigenes Backend mit (WebSocket-Server)
- Rechteverwaltung, Gruppenchats, geteilte Workspaces
- Optional — wer alleine arbeitet braucht es nicht

---

## 5. Plattform-Shells + Default-Bundles

Eine Codebasis, verschiedene Shells. Jede Shell kommt mit einem passenden
vorinstallierten Plugin-Bundle. Danach frei erweiterbar.

| Variante         | Shell                        | Default-Bundle                          |
|------------------|------------------------------|-----------------------------------------|
| Android Launcher | Capacitor + Home-Intent      | Theme + Chat + Launcher-Widgets         |
| Android App      | Capacitor (normal)           | Theme + Chat                            |
| iOS App          | Capacitor                    | Theme + Chat                            |
| Web App          | Browser                      | Chat + Notes                            |
| Linux Desktop    | Tauri + Hyprland-Integration | Theme + Chat + Notes + Desktop-Integr.  |
| macOS Desktop    | Tauri                        | Theme + Chat + Notes                    |
| Windows Desktop  | Tauri                        | Theme + Chat + Notes                    |

Der Kern und alle Plugins sind identisch über alle Varianten.
Nur die Shell und das vorinstallierte Bundle unterscheiden sich.

---

## 6. Tech-Stack

| Komponente        | Technologie                                      |
|-------------------|--------------------------------------------------|
| Sprache           | TypeScript                                        |
| UI-Framework      | **Svelte 5** (Runes) + Vite 6                     |
| Desktop-Shell     | Tauri 2 (Rust) — vorgesehen                        |
| Mobile-Shell      | Capacitor 8 (Android live)                        |
| Plugin-API        | Obsidian-kompatible Patterns                      |
| Farbextraktion    | @material/material-color-utilities                |
| Design-System     | CSS Custom Properties / Design Tokens             |

---

## 7. Code-Konventionen

- Folgt **Obsidians Plugin-API-Patterns** — bestehende Plugin-Entwickler
  sind sofort produktiv, Plugins sind portierbar
- **VS Code Extension API** als Vorbild für Kommandopalette und Settings
- **KI-optimierte Doku** — strukturiert für LLMs, nicht nur für Menschen
- Jedes Plugin hat ein `CLAUDE.md` mit API-Kontext für KI-Entwicklung

---

## 8. Erste Plugins (Bau-Reihenfolge)

1. **Theme** — Set-Editor, Farbextraktion, Hell/Dunkel
2. **KI-Chat** — das Herzstück, Sojus-Interface
3. **Second Brain / Notes** — Markdown-Editor, Links, Graph
4. **Nextcloud-Adapter** — MCP-Server existieren schon
5. **PM-Adapter** — OpenProject/Vikunja
6. **Sync** — Device-Synchronisation
7. **Avatar** — 2D/3D mit Lippensync

---

## 9. Was dieses Projekt NICHT ist

- **Kein eigenes Backend** für alles — Adapter zu existierenden Backends
- **Kein Obsidian-Klon** — Obsidian-Plugins laufen, aber es ist mehr
- **Kein weiteres Chat-UI** — Chat ist ein Plugin von vielen
- **Kein geschlossenes Ökosystem** — Open Source, offene Plugin-API
- **Keine neue Programmiersprache/Framework** — bewährter Web-Stack
