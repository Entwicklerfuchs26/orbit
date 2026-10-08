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
- Android-APK: `nix-shell android-shell.nix --run "CAP_SERVER_URL=http://192.168.1.40:5173 npx cap sync android && cd android && ./gradlew assembleDebug"`.
  APK-Download: `http://192.168.1.40:5173/wallpaper.apk` (serveApk-Middleware liest
  direkt aus dem Build-Output — **nicht** nach `static/` kopieren, sonst wandert
  sie ins Bundle).

## Harte Regeln

- **Reine Web-Änderung** → nur App-Reload. **Native Änderung** (Java/Manifest) →
  APK neu bauen + reinstallieren (Android setzt dabei das Live-Wallpaper zurück →
  neu auswählen).
- Nie große Medien als base64 über die Bridge (→ ANR).
- Beim Umbenennen von Plugin-IDs/Keys: Config-Migration in `main.ts` (sonst
  Datenverlust).
- Nach jedem fertigen Block: **sofort Cloud-Push** an Jonas (`PushNotification`),
  nicht Home Assistant.

## Testlisten

Jede Testliste gehört in `FEATURES.md`. `- [x]` nur, wenn Jonas bestätigt hat,
sonst `- [ ]` offen lassen.
