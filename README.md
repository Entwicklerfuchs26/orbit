# Orbit

**Orbit** ist ein universelles, plugin-basiertes KI-Frontend — eine einheitliche
Oberfläche für Open-Source-Tools, bei der *alles ein Plugin* ist. Plugins und der
KI-Agent kreisen um einen gemeinsamen Kern/Kontext.

Eine Codebasis (TypeScript + Svelte 5), läuft als **Web** und **Android**
(Capacitor); **Desktop** (Tauri) ist vorgesehen.

## Status

In aktiver Entwicklung. Erstes großes Plugin: **skwd-wall** — bringt
[SKWD Wall](https://github.com/liixini/skwd-wall) aufs Handy.

**skwd-wall ist feature-komplett** (Stand 09.10.2026, ohne Sync):
- Wallpaper hinzufügen auf **drei Wegen**: Upload, Wallhaven-Online-Suche und
  **echte Ordner einbinden** (nativ via Android SAF, am PC via File System Access) —
  ohne Hochladen, mit nativen **Thumbnails** (flüssiges Scrollen, kein 4K im RAM).
- 7 Ansichts-Modi, 1:1 aus dem SKWD-Quellcode adaptiert (zentriert aufs aktive
  Bild, vertikal durchblätterbar per Wisch/Mausrad).
- Automatisches Farbschema (Material You), Übergänge, Papierkorb, Zeitplan,
  Auto-Wechsel, kategorisierte Einstellungen.
- System-Hintergrund (Home/Lock) + nativer OpenGL-**Live-Wallpaper**-Dienst.

**Kern-Phase erledigt:** Capability-API, wählbare Startseite + **Orbit-Home**,
animierter **Orbit-Einstieg** & SKWD-Wall-Einrichtung, **Plugin-Store** mit
Versionierung/Updates/Rollback und Detailseiten (Beschreibung + Neuigkeiten),
Multitasking-Schalter, eigenes **App-Icon** — und eine **eigenständige APK**, die
ihre Plugins eigenständig aus dem Store ([orbit-plugins](https://github.com/Entwicklerfuchs26/orbit-plugins))
lädt (bringt selbst keins mit). Einrichtungsdialoge folgen einem festen
[Design-Standard](CONVENTIONS.md).

Als Nächstes: Launcher-Modus (Android-Homescreen) + Gesten, dann PC↔Handy-**Sync**.

## Schnellstart

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run check      # Typprüfung
npm run build      # Produktions-Build nach dist/
```

Android-APK bauen (projekt-lokale Toolchain via nix):

```bash
# Dev-APK (lädt live vom Vite-Server):
nix-shell android-shell.nix --run \
  "CAP_SERVER_URL=http://<lan-ip>:5173 npx cap sync android && cd android && ./gradlew assembleDebug"

# Eigenständige APK (gebündelt, lädt Plugins aus dem Store):
npm run build && nix-shell android-shell.nix --run \
  "npx cap sync android && cd android && ./gradlew assembleDebug"
```

Plugins veröffentlichen (SHA-gepinnt ins orbit-plugins-Repo):

```bash
node scripts/publish-plugins.mjs <klon-von-orbit-plugins>
```

## Struktur

```
src/core/      Kern + Plugin-API (kennt keine Features; settings.ts = Settings-Framework)
src/shell/     sichtbarer App-Rahmen (inkl. SettingsView.svelte = generischer Settings-Renderer)
src/platform/  dünne native Adapter (Web-/Native-Zweige)
src/plugins/   ein Ordner pro Plugin (+ _template/ als Vorlage)
src/styles/    Design-Tokens
android/       native Android-Hülle (Capacitor) — WallpaperPlugin + FolderAccessPlugin (SAF)
docs/          Doku (+ docs/archive/ für Altlasten)
```

## Weiterlesen

- [`CONVENTIONS.md`](CONVENTIONS.md) — Bau-Standards (Plugins, State/Settings, Plattform).
- [`AGENTS.md`](AGENTS.md) — Kurzregeln fürs (KI-)Bauen.
- [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md) — Architektur im Detail.
- [`docs/ZUSAMMENARBEIT.md`](docs/ZUSAMMENARBEIT.md) — Arbeitsweise.
- [`FEATURES.md`](FEATURES.md) — lebende Test-Checkliste.
