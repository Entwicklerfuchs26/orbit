# AGENTS.md — Arbeitsanleitung für KI-Agenten (Orbit)

Knappe Regeln fürs autonome Bauen in diesem Repo. Details: `CONVENTIONS.md`.

## Was ist Orbit

Universelles, plugin-basiertes KI-Frontend („alles ist ein Plugin"). Eine
Svelte-Codebasis, läuft als Web + Android (Capacitor), später Desktop (Tauri).
Erstes großes Plugin: **skwd-wall** (SKWD-Wall aufs Handy, inkl. nativem
GL-Live-Wallpaper).

## Wo liegt was

- `src/core` Kern/Plugin-API · `src/shell` UI-Rahmen · `src/plugins/<id>` Features
  · `src/platform` native Adapter · `src/styles` Tokens · `src/main.ts` Boot.
- `android/` native Hülle (Capacitor) · `docs/` Doku (+ `docs/archive/` Altlasten)
  · `static/` 1:1-Assets.
- Auto-generiert, ignoriert: `node_modules/`, `dist/`, `android/**/build`.

## Bauen / Prüfen

- `npm run dev` → Dev-Server :5173. `npm run check` (Typen) + `npm run build`
  müssen grün sein.
- Store-Plugin bauen (eigenständiges ESM): `PLUGIN=<id> npm run build:plugin` →
  `plugins-dist/<id>/main.js` (nur `@core` external → `globalThis.Orbit`, Rest gebündelt).
  Alle Store-Plugins + Repo-Layout fürs orbit-plugins-Repo: `node scripts/assemble-registry.mjs`.
- Android-APK: `nix-shell android-shell.nix --run "CAP_SERVER_URL=http://192.168.1.40:5173 npx cap sync android && cd android && ./gradlew assembleDebug"`.
  APK-Download: `http://192.168.1.40:5173/wallpaper.apk` (serveApk-Middleware liest
  direkt aus dem Build-Output — **nicht** nach `static/` kopieren, sonst wandert
  sie ins Bundle).

## Kern-Muster (so, nicht anders)

- **Einstellungen = deklarativ.** Nicht pro Feld eine Svelte-Zeile bauen: ein Feld
  in `types.ts` (`*State` + `DEFAULT_STATE`) + ein Eintrag im Schema in
  `*Settings.svelte` (`SettingDef`: toggle/slider/segment/select/text/color/button/
  custom, optional `category` für Reiter) + `manager.setField(key, value)`.
  Gerendert vom generischen `src/shell/SettingsView.svelte` (Kategorie-Reiter,
  scroll-sicherer Slider, Settle-Guard). Nur echte Sonderfälle als `custom`-Snippet.
- **Speicher.** Bild-/Blob-Daten in IndexedDB (`storage.ts`). Externe Ordner
  (referenziert, nicht kopiert) über `folders.ts` — Web = File System Access API,
  nativ = `FolderAccess`-Plugin (SAF). Galerie zeigt Thumbnails (`folderThumbUrl`),
  Anwenden nutzt volle Auflösung (`manager.fullUrl`), Laden ist faul
  (IntersectionObserver `use:ensure`, Freigabe außer Sicht).
- **Native Fähigkeiten gehören in den Kern.** Nativer Code (Android/iOS) ist NICHT
  als Plugin downloadbar → er lebt im Kern-APK und wird als **generische Capability**
  (Datei/Ordner, Wallpaper, Live-Wallpaper) angeboten, die jedes Plugin nutzen kann —
  nicht plugin-spezifisch hardcoden.

## Harte Regeln

- **Reine Web-Änderung** → nur App-Reload. **Native Änderung** (Java/Manifest) →
  APK neu bauen + reinstallieren (Android setzt dabei das Live-Wallpaper zurück →
  neu auswählen).
- Nie große Medien als base64 über die Bridge (→ ANR). Thumbnails nativ
  heruntersampeln (`inSampleSize`), nicht voll decodieren.
- Beim Umbenennen von Plugin-IDs/Keys: Config-Migration in `main.ts` (sonst
  Datenverlust). Neue native Capability → in `MainActivity` registrieren.
- Nach jedem fertigen Block: **sofort Cloud-Push** an Jonas (`PushNotification`),
  nicht Home Assistant.

## Testlisten

Pro Bereich eine eigene Datei, damit keine Liste „arschlang" wird:
**Kern/Shell** → `FEATURES.md` (Root; Plattform-Unterschiede inline **[Web]**/**[nativ]**
getaggt). **Plugins** → `src/plugins/<id>/FEATURES.md` (bzw. im Plugin-Repo).
`- [x]` nur, wenn Jonas bestätigt hat, sonst `- [ ]` offen lassen.
