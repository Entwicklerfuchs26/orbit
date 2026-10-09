# Architektur — KI-Betriebssystem

## Idee in einem Satz

Ein universeller Plugin-Loader für KI-Anwendungen — wie NixOS, aber für GUIs.
Der Kern kann nichts außer Plugins laden. Alles andere (Chat, Notizen, Themes,
Nextcloud, Projektmanagement, Avatar) sind Plugins.

> **Hinweis:** Dieses Dokument beschreibt die **Vision**. Der real gebaute Stand
> steht in Abschnitt 0. Wo Vision und Ist abweichen, gilt für die Bauarbeit das Ist
> + `CONVENTIONS.md`.

---

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
  gehört in den Kern und wird als generische Capability für alle Plugins angeboten
  (beim Kern-Umbau sauber als API herauslösen).
- **Offen / als Nächstes (Kern-Phase):** Standard-Startseite, Onboarding,
  Plugin-Store (JS-Plugins, evtl. GitHub), eigenständige teilbare APK (bringt kein
  Plugin mit), danach PC↔Handy-Sync. Deklarative Plugin-Verwaltung auf dem PC
  (NixOS/Home-Manager) ist angedacht.

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
