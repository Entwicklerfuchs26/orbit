# Session 07.10.2026 — Zusammenfassung

## Was passiert ist

### Feature-Picker erweitert (507 → 718 Features)
- **68 Obsidian-Features** hinzugefügt (obsidian-001 bis obsidian-068)
  - Kategorien: Wissensmanagement, Editor, Visualisierung, Suche, KI-Integration, Datenabfragen, Tagesnotizen, Kalender, Lernen, Schreiben, Datensicherheit, Anpassung
- **52 AppFlowy-Features** hinzugefügt (appflowy-001 bis appflowy-052)
  - Kategorien: Datenbanken (19), Dokumente (13), KI-Integration (7), Organisation (5), Zusammenarbeit (3), Plattform (4)
- **30 PM-Adapter-Features** (sojus-001 bis sojus-030)
  - Backend-Adapter-System, KI-gestützte Aufgaben, Multi-Backend-Sync, Second-Brain-Verknüpfung
- **26 Plattform/Plugin/Theme-Features** (sojus-031 bis sojus-056)
  - Plattform & Architektur (10), Plugin-System (7), Theming & Anpassung (5), Entwickler-Ökosystem (4)
- **16 KI-Avatar-Features** (sojus-057 bis sojus-072)
  - Live-Sprachmodus, 2D/3D-Avatar mit Lippensync, Avatar steuert UI, Multi-Avatar pro Agent, VTuber-Modus
- **19 Nextcloud-Integration-Features** (sojus-073 bis sojus-091)
  - Dateibrowser, Kalender, Talk, Notizen, Kontakte, Kochbuch, News, Deck, Kollektive, Tables, Multi-Instanz

### Neue SOURCES im Picker
- `obsidian` (Farbe: #7E3FF2, lila)
- `appflowy` (Farbe: #00BCF0, blau)
- `sojus` (Farbe: #FF6B35, orange-rot)

### Feature-Picker Bugs gefixt (aus vorheriger Session)
- Vote-Buttons funktionierten nicht in WKWebView (Claude iOS App)
  - Root Cause: `onSnapshot` (Cloud-Listener) überschrieb `state.decisions` nach jedem lokalen Vote
  - Fix: Ersetzt durch einmaligen `db.doc.get()`, der nur bei leerem Local-State lädt
- Cloud-Sync: Push/Pull-Buttons hinzugefügt
- JSON-Export auf Mobile: `downloads`-Capability statt Blob-Download

### Artifact
- URL: https://claude.ai/code/artifact/a975fe0a-d609-4d2d-b492-777f2ae9de68
- Capabilities: db, user, downloads
- Datei: feature-picker-v2.html (lokal im Projektordner)

## Architektur-Entscheidungen

### Vision
Universelles KI-Frontend / KI-Betriebssystem. Kein eigenes Backend — Adapter zu existierenden Backends. Der Kern ist nur ein Plugin-Loader (wie NixOS nur ein Package-Manager ist).

### Kern = drei Dinge
1. Plugins laden (JS-Module, Obsidian-API-Pattern)
2. Deklarative Config (NixOS-Prinzip, JSON)
3. Minimale Shell (Sidebar, Tabs, Kommandopalette)

### Alles andere = Plugins
- **gui**: Chat, Notes, Avatar, Kalender
- **adapter**: Nextcloud, OpenProject, Immich, Jellyfin
- **theme**: Design-Pakete (Set = Wallpaper + Farben + Schrift + alles)
- **tool**: Sync, Multi-User, Backup

### Tech-Stack
- TypeScript + Web-Framework (Svelte/Solid/React, noch offen)
- Tauri (Desktop), Capacitor (Mobile), Browser (Web)
- Plugin-API folgt Obsidian-Patterns (Obsidian-Plugin-Kompatibilität geplant)
- Material You für Farbextraktion

### Preset-Bundles
Minimal (nur Chat), Handy (Chat+Theme+Launcher), Desktop (Chat+Theme+Notes), Vollausstattung (alles)

### Plugin-Distribution
Phase 1: GitHub-Link eingeben. Phase 2: Registry. Phase 3: Store.

### Theme-System
Kein SKWD-Wall-Klon — eigenes System inspiriert vom Konzept. Set = Wallpaper + Farbpalette + Schrift + Cursor + Icon-Pack + UI-Dichte. Synchronisiert zwischen Geräten. Steuert auf Linux auch Desktop, auf Android auch System-Farben.

## Recherche-Ergebnis
Es gibt kein vergleichbares Projekt. Mercury OS (2019) hatte die Vision, wurde nie gebaut. Alle existierenden Tools machen nur eine Sache (Chat ODER Notes ODER Launcher ODER Desktop).

## Geschäftsmodell
Open Source Kern. Geld über Services (Cloud-Sync, Hosting, Support). Software wird langfristig kostenlos weil KI die Entwicklung demokratisiert — der Wert liegt im Ökosystem, nicht im Code.

## Offene Entscheidungen
- Web-Framework: Svelte vs Solid vs React
- Projektname (noch "skwd-wall-sync", wird zu groß dafür)
- Jonas' Feature-Picker-Bewertung steht noch aus (~718 Features durchgehen)
- Multi-User: Jonas hat ~105 Features initial als "nein" bewertet, will sie ggf. neu bewerten weil Multi-User doch Sinn macht

## Späte Ergänzungen (Ende der Session)

### 7 Plattform-Varianten mit Default-Bundles
Eine Codebasis, verschiedene Shells drumrum. Jede Variante kommt mit passendem
vorinstalliertem Plugin-Bundle:
- Android Launcher (Capacitor + Home-Intent) → Theme + Chat + Launcher-Widgets
- Android App (Capacitor normal) → Theme + Chat
- iOS App (Capacitor) → Theme + Chat
- Web App (Browser) → Chat + Notes
- Linux Desktop (Tauri + Hyprland) → Theme + Chat + Notes + Desktop-Integration
- macOS (Tauri) → Theme + Chat + Notes
- Windows (Tauri) → Theme + Chat + Notes

### Admin-Plugin (Idee)
Ein Power-User-Plugin das Terminal-Befehle (occ, rails console, etc.) hinter
GUI-Buttons packt. Für Sachen die sonst SSH + Doku brauchen. Mit Risiko-Warnung.

### API-Abdeckung der Backends
Nextcloud ~90%, OpenProject ~80%, Immich ~85%, Jellyfin ~95%, Home Assistant ~98%.
Für 99% der Features reichen die APIs. Shell-Befehle nur als Fallback für Admin-Kram.
