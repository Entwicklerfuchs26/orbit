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

## 6. Store: Versionierung, Updates, Rollback, Detailseite
*Veröffentlicht via `scripts/publish-plugins.mjs` (SHA-gepinnt). APK bringt kein
Feature-Plugin mit – alles kommt aus dem Store.*
- [ ] Plugins → **Aktualisieren** holt den neuesten Build (Banner „N Updates", Punkt am Sidebar-Eintrag)
- [ ] **Versions-Dropdown** (ab 2 Versionen): ältere Version wählen = Rollback
- [ ] Plugin-Karte antippen → **Detailseite** mit Tabs **Beschreibung** + **Neuigkeiten** (Changelog ohne Update sichtbar)
- [ ] Katalog listet Plugins; „Installieren"/„Deinstallieren" wirken; schon vorhandene = „Bereits vorhanden"

## 7. Orbit-Home, Multitasking, Einstieg
- [ ] **Orbit-Home** ist die Startseite (Kacheln: Plugins öffnen, Store, Einstellungen); „Orbit"-Wortmarke oben führt dahin; kein leerer Bildschirm mehr
- [ ] **Multitasking-Tabs** (Einstellungen → Fenster): aus = eine Ansicht/keine Tab-Leiste, an = mehrere Tabs
- [ ] **Orbit-Einstieg** nur beim ersten Start; Einstellungen → Einstieg → **„Erneut anzeigen"** spielt ihn wieder ab
- [ ] Einstieg: SKWD-Wall-Schnellweg (+ „Als Startseite") ODER „Orbit entdecken" (Erklär-Folien + Plugin-Picker)

## 8. Eigenständige APK (nativ)
- [ ] [nativ] Standalone-APK startet ohne Dev-Server; Erststart → Orbit-Einstieg; SKWD Wall wird aus dem Store nachgeladen (Internet)
- [ ] [nativ] Eigenes **Orbit-App-Icon** auf dem Homescreen; App heißt „Orbit"
- [ ] [nativ] Wallhaven-Online ohne Dev-Proxy (nativer Direktabruf) — auf Fremdgerät prüfen

---

## Plan / Roadmap

### ✅ Erledigt (09.10.2026)
- [x] Capability-API · Startseite · Onboarding · Plugins-Store (Versionierung/Updates/Rollback/Detailseite)
- [x] Externalisierung + SHA-gepinnte Veröffentlichung · Orbit-Home · Multitasking-Schalter
- [x] Animierter Orbit-Einstieg · SKWD-Wall-Einrichtung · Orbit-App-Icon · **eigenständige APK**

### ▶ Als Nächstes
- [ ] Wallhaven-Standalone auf echtem Fremdgerät verifizieren
- [ ] Signierter Release-Build (F-Droid/IzzyOnDroid/Play — später)
- [ ] Launcher-Modus (Android-Homescreen) + Gesten-Hooks
- [ ] Plugins von außen erreichbar (Homescreen-Geste → Plugin); deklarative Plugin-Verwaltung am PC (NixOS/Home-Manager)

### Später
- [ ] **Sync PC ↔ Handy**
- [ ] Desktop-Variante (Tauri), iOS
- [ ] App-Name festlegen (Platzhalter)
