# Umsetzungsplan (3 Teile)

Reihenfolge: **Teil 1 → Teil 2 → Teil 3.** Erst den Stil verstehen, dann skwd-wall
erweitern (ist die Grundlage), dann der Launcher als Gegenstelle.

---

## TEIL 1 — Analyse & Stil-Anpassung (skwd-wall)
Das ganze Repo analysieren: QML/Quickshell-UI **und** Rust-Backend.

Besonders achten auf:
1. Architekturmuster & Ordnerstruktur
2. Benennungsregeln (Variablen, QML-Komponenten, Funktionen)
3. Formatierungsstil, Kommentare, Fehlerhandling
4. Zustandshandling zwischen Rust ↔ QML

**Ziel:** Stil von *liixini* komplett übernehmen. Neue/geänderte Dateien müssen
aussehen, als hätte er sie geschrieben. Kein fremdes Muster, kein unnötiger Boilerplate.

---

## TEIL 2 — skwd-wall Erweiterung (schrittweise)

**1. Datenmodell für Sets**
- JSON-Struktur für Theme-Sets: je ein Querformat-Bild (Desktop 16:9), ein
  Hochformat-Bild (Handy 9:16), eine Hell/Dunkel-Präferenz.
- Speicherort: `~/.config/skwd-wall/sets.json`.

**2. QML-Reiter "Sets"**
- Neuer Reiter "Sets" im UI.
- Vorhandene Sets anzeigen.
- Menü zum Anlegen neuer Sets (Bildauswahl Quer- + Hochformat) und zum Aktivieren.

**3. Netzwerk-Schnittstelle & Sync**
- Leichte Schnittstelle für Steuerbefehle: HTTP/WebSocket **oder** D-Bus-Listener
  (KDE Connect).
- Bei Wechsel-Signal: Desktop-Wallpaper aktualisieren **+** Farbgenerierung
  (Matugen/Pywal) anstoßen.

**4. Konfiguration & PR-Vorbereitung**
- Mobile-Sync per Schalter in `config.toml` (`enable_mobile_sync = true`).
- Code sauber halten für einen **Pull Request** ans Haupt-Repo.

---

## TEIL 3 — Custom Android Launcher (Kotlin / GrapheneOS)

Neues, eigenständiges Launcher-Projekt.

**1. Basis-Architektur & Einstellungen**
- `CATEGORY_HOME` im `AndroidManifest.xml` deklarieren.
- Einstellungen-Seite mit Schalter `feature_ai_enabled` (Standard: **aus**).
- Bei aus: sämtlicher KI-/Netzwerk-Code **komplett umgangen**.

**2. Wallpaper- & Set-Sync (KDE Connect)**
- KDE-Connect-Protokoll: Auto-Geräteerkennung im WLAN + sichere TLS-Übertragung.
- Modul für Custom-Pakete (Set-Wechsel empfangen/senden).
- Hochformat-Bild via Android `WallpaperManager` anwenden.

**3. Optionales KI-Chat-Overlay**
- Gesten-Erkenner am Startbildschirm (z.B. Wisch nach oben).
- `feature_ai_enabled` AN: Jetpack-Compose-Chat-Overlay (`ModalBottomSheet`) mit
  Streaming an lokalen KI-Endpunkt (Ollama — oder Sojus/Hermes via WireGuard).
- `feature_ai_enabled` AUS: Geste anders belegen (z.B. normalen App-Drawer öffnen).
