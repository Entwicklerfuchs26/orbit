# Orbit-Kern — Feature- & Test-Checkliste

Stand: 09.10.2026. Testen über Live-Reload (`http://192.168.1.40:5173/` bzw. installierte App).
Nach Web-Änderungen reicht **App neu laden**; nach nativen Änderungen braucht es einen APK-Rebuild.

**Diese Datei = nur der Kern/die Shell.** Jedes Plugin hat seine eigene Testliste:
`src/plugins/<id>/FEATURES.md` (bzw. im jeweiligen Plugin-Repo). So bleibt keine Liste
„arschlang". Plattform-Unterschiede (Web / Android-nativ) sind hier inline mit
**[Web]** / **[nativ]** getaggt; eigene Dateien pro Plattform (iOS/Desktop) kommen,
wenn diese Plattformen existieren.

**Workflow:** `- [x]` = von Jonas bestätigt. `- [ ]` = offen (Jonas hakt selbst ab).

---

## 1. Kern / Shell
- [x] App lädt, bootet die Shell (Sidebar + Tabs + Kommandopalette)
- [x] Kein „Sojus"-Schriftzug (App-Name-Platzhalter)
- [x] Plattform wird erkannt (web / mobile)
- [x] Sidebar listet aktive Plugin-Menüpunkte; Ctrl+P öffnet die Kommandopalette

## 2. Capability-API (Block 1)
*Native Fähigkeiten (Ordner, Wallpaper, Live-Wallpaper) laufen über eine saubere
Kern-API (`app.capabilities`) statt direkter Plugin-Imports. Regressionstest — Verhalten
soll unverändert sein.*
- [ ] [Web] App lädt normal, Galerie + Theming wie vorher
- [ ] [Web] PC (Chrome/Edge): Ordner einbinden geht weiter; Browser ohne FS-Access zeigt den Hinweistext
- [ ] [Web] Kein „Als Hintergrund"-Knopf (nur nativ)
- [ ] [nativ] Ordner (SAF), System-Hintergrund setzen, Live-Wallpaper + Auto-Wechsel wie vorher

## 3. Navigations-API: Startseite wählbar (Block 2)
*Ein Plugin kann sich als Standard-Startseite anbieten; die Startseite ist wählbar.*
- [ ] Einstellungen → **Allgemein** → Block **Start** mit Auswahl **Startseite**
- [ ] Auswahl listet **Letzte Sitzung** + alle verfügbaren Ansichten
- [ ] Startseite auf ein Plugin stellen → die Ansicht öffnet sofort
- [ ] Alle Tabs schließen + neu laden → feste Startseite öffnet genau diese; „Letzte Sitzung" stellt die alten Tabs wieder her
- [ ] Frischer Start (leerer Speicher) landet automatisch auf der Standard-Startseite statt auf leerem Bildschirm

## 4. Onboarding (Block 3)
*Beim allerersten Start (leerer Speicher) ein Einrichtungs-Dialog: Bundle/Plugins wählen.
Bestehende Tester sehen ihn NICHT. Zum Testen: localStorage leeren + neu laden.*
- [ ] Frischer Start zeigt **„Willkommen bei Orbit"** mit Bundle-Karten
- [ ] Empfohlenes Bundle ist vorausgewählt
- [ ] **Eigenes** klappt eine Plugin-Liste mit Haken auf (einzeln wählbar)
- [ ] **Los geht's** ist aus, wenn nichts gewählt ist; sonst aktiviert es die Plugins + landet auf der Startseite
- [ ] Nach Abschluss erscheint der Dialog bei normalem Neuladen **nicht mehr**
- [ ] Bestehende Installation zeigt den Dialog **gar nicht**

## 5. Plugins-Bereich / Store (Block 4)
*Eigener Punkt **Plugins** in der Sidebar (unten). Tabs **Installiert** + **Store**
(Manifest-Liste + Direkt-Link). Remote-Laden gegen `globalThis.Orbit`.*
- [ ] Sidebar unten: **Plugins** öffnet den Bereich
- [ ] **Installiert** listet Plugins (Name, Typ, Beschreibung) mit An/Aus-Schalter; An/Aus wirkt sofort
- [ ] Zahnrad öffnet die Plugin-Einstellungen inline + **Zurück**
- [ ] **Store** → Feld „Aus GitHub-Link laden" (rohe manifest.json); Unsinn-Link → verständlicher Fehler
- [ ] Katalog aus dem orbit-plugins-Repo lädt; „Installieren" lädt + aktiviert ein echtes Remote-Plugin; **Deinstallieren** entfernt es

## 6. Plugin-Externalisierung (Block 5, Pipeline)
*Grundlage für „APK bringt kein Plugin mit".*
- [x] `PLUGIN=<id> npm run build:plugin` baut je ein eigenständiges `main.js` (bindet an `globalThis.Orbit`, Styles im JS)
- [x] `node scripts/assemble-registry.mjs` erzeugt `plugins-dist/registry/` fürs orbit-plugins-Repo
- [ ] [nativ] NÄCHSTER SCHRITT (Gerät): eingebaute Plugins aus der APK entfernen + Onboarding installiert aus dem Store
- [ ] [nativ] Standalone-APK: kein Dev-Server-Zwang (Plugin-spezifische Zusätze wie Wallhaven-Direktabruf stehen in der jeweiligen Plugin-Testliste)

---

## Plan / Roadmap

### ✅ Kern-Phase (09.10.2026)
- [x] Capability-API · Startseite · Onboarding · Plugins-Store · Externalisierungs-Pipeline

### ▶ Als Nächstes (braucht Gerät + orbit-plugins live)
- [ ] orbit-plugins-Repo befüllen → Remote-Install im Store testen
- [ ] Eingebaute Plugins aus `main.ts` entfernen (APK bringt kein Feature-Plugin mit); Onboarding installiert aus dem Store
- [ ] **Eigenständige APK** — losgelöst vom Dev-Server, an beliebige Person weitergebbar
- [ ] Launcher-Modus (Android-Homescreen) + Gesten-Hooks
- [ ] Offene Fragen: Plugins von außen erreichbar (Homescreen-Geste → Plugin); deklarative Plugin-Verwaltung am PC (NixOS/Home-Manager)

### Später
- [ ] **Sync PC ↔ Handy**
- [ ] Desktop-Variante (Tauri), iOS
- [ ] App-Name festlegen (Platzhalter)
