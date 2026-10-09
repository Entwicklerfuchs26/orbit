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

Als Nächstes: **Kern-Arbeit** (Standard-Startseite, Onboarding, Plugin-Store,
eigenständige teilbare APK), dann PC↔Handy-**Sync**.

## Schnellstart

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run check      # Typprüfung
npm run build      # Produktions-Build nach dist/
```

Android-APK bauen (projekt-lokale Toolchain via nix):

```bash
nix-shell android-shell.nix --run \
  "CAP_SERVER_URL=http://<lan-ip>:5173 npx cap sync android && cd android && ./gradlew assembleDebug"
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
