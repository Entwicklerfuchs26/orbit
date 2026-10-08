# Orbit

**Orbit** ist ein universelles, plugin-basiertes KI-Frontend — eine einheitliche
Oberfläche für Open-Source-Tools, bei der *alles ein Plugin* ist. Plugins und der
KI-Agent kreisen um einen gemeinsamen Kern/Kontext.

Eine Codebasis (TypeScript + Svelte 5), läuft als **Web** und **Android**
(Capacitor); **Desktop** (Tauri) ist vorgesehen.

## Status

In aktiver Entwicklung. Erstes großes Plugin: **skwd-wall** — bringt
[SKWD Wall](https://github.com/liixini/skwd-wall) aufs Handy: Wallpaper-Picker
(eigene Bilder + Wallhaven), Ansichts-Modi, automatisches Farbschema, Übergänge
und ein nativer OpenGL-**Live-Wallpaper**-Dienst. PC↔Handy-Sync folgt.

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
src/core/      Kern + Plugin-API (kennt keine Features)
src/shell/     sichtbarer App-Rahmen
src/platform/  dünne native Adapter (Web-/Native-Zweige)
src/plugins/   ein Ordner pro Plugin (+ _template/ als Vorlage)
src/styles/    Design-Tokens
android/       native Android-Hülle (Capacitor)
docs/          Doku (+ docs/archive/ für Altlasten)
```

## Weiterlesen

- [`CONVENTIONS.md`](CONVENTIONS.md) — Bau-Standards (Plugins, State/Settings, Plattform).
- [`AGENTS.md`](AGENTS.md) — Kurzregeln fürs (KI-)Bauen.
- [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md) — Architektur im Detail.
- [`docs/ZUSAMMENARBEIT.md`](docs/ZUSAMMENARBEIT.md) — Arbeitsweise.
- [`FEATURES.md`](FEATURES.md) — lebende Test-Checkliste.
