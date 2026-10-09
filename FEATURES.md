# Feature- & Test-Checkliste

Stand: 08.10.2026. App über Live-Reload testen (`http://192.168.1.40:5173/` bzw. installierte App).
Nach Web-Änderungen reicht **App neu laden**.

**Workflow:** Jede neue Testliste kommt hier rein. `- [x]` = von Jonas bestätigt. `- [ ]` = noch offen (Jonas hakt selbst ab).

---

## 1. Kern / Shell
- [x] App lädt, zeigt den Wallpaper-Picker (oder Willkommen, wenn leer)
- [x] Kein „Sojus"-Schriftzug (App-Name-Platzhalter „KI-OS")
- [x] Plattform wird erkannt (web / mobile)

## 2. Wallpaper hinzufügen (➕ „Hinzufügen")
- [x] Rail → ➕ → Vollbild-Overlay mit Tabs **Hochladen / Online**
- [x] **Hochladen**: Bilder vom Gerät wählen → erscheinen in der Galerie
- [x] **Online (Wallhaven)**: Vorschläge laden automatisch; Suche + Enter → Treffer
- [x] Filter-Knopf klappt Filter auf/zu; Sortierung/Kategorie/Seitenverhältnis wirken
- [x] Weit runterscrollen lädt mehr nach (Pagination)
- [x] Bild antippen → Vollbild-Vorschau + unten **Herunterladen**

## 3. Galerie / Ansichts-Modi
- [x] Wall / Geometric (Waben) / Slices / Depth / Sandy / Card hand / Collection
- [x] Vertikal scrollbar; aktives Wallpaper markiert
- [x] Modus-Wechsel über Einstellungen → Ansicht

## 4. Theming (ganze App folgt dem Wallpaper)
- [x] Neues Wallpaper → App-Farben passen sich an
- [x] Farbcharakter (9) / Finish / Palette (Wallpaper/fest/beibehalten) / Modus Hell-Dunkel-Auto / UI-Größe

## 5. Vertikale Swipe-Leiste (Rail)
- [x] Rand antippen → Leiste fährt rein (schräges Parallelogramm); fährt von selbst wieder ein
- [x] Finger hoch/runter → Icon hervorgehoben (Label-Fähnchen); loslassen löst aus
- [x] Farbe: Regenbogen-Sub-Leiste (schwebend), swipen wählt, nochmal = aus
- [x] Sortieren-Sub-Leiste; Favoriten / Zufall / Suche

## 6. Flip-Karte (langes Drücken)
- [x] Lange halten → flippt zur Rückseite
- [x] Favorisieren (Stern) → Herzchen auf der Kachel
- [x] **Tags**: Tag + Enter → Chip; × entfernt; Suche findet nach Tag
- [x] **Effekt** → Umfärben/Graustufen/Sepia/Poster/Invertiert → Vorschau → „Als neues Wallpaper speichern"
- [x] Löschen / Fertig

## 7. Übergänge
- [x] CSS (Überblenden/Schieben/Zoom/Wischen) + GPU/WebGL (Warp/Morph/Pixel/Traum/Streifen/Welle/Wirbel/Iris/Punkte/Wind/Schraffur)

## 8. Einstellungen (⚙) — *noch durchzutesten*
- [ ] **Ansicht**: Modus wählen
- [ ] **Wallpaper → Anpassung**: Füllen/Einpassen/Strecken/Zentriert/Kacheln
- [ ] **Wallpaper → Abdunkeln**
- [ ] **Kacheln**: Größe + Eckenradius
- [ ] **Übergang beim Wechsel**: Typ + Dauer
- [ ] **Automatischer Wechsel**: An + Intervall + „nur Favoriten"
- [ ] Auto-Wechsel: **Systemhintergrund mitsetzen** (🏠/🔒)
- [ ] **Menü**: Seite, Verhalten, Ausblende-Zeit

## 9. Geräte (NEU — bitte testen)
- [ ] Einstellungen → **Geräte** → **Handy (Android)** ist ein echter **Schiebe-Schalter** (runder Knopf wechselt die Seite), kein Zweierbutton
- [ ] Handy **aus** → alle Handy-Funktionen verschwinden (Systemhintergrund, Auto-OS-Ziele, Live-Wallpaper); App = reine Web-/In-App-Ansicht
- [ ] Handy **an** → Handy-Funktionen wieder da
- [ ] Handy an → darunter **Live-Wallpaper**-Schiebe-Schalter sichtbar (Funktion folgt im nativen Block)
- [ ] Auch „Automatischer Wechsel" ist jetzt ein Schiebe-Schalter

## 11. Layout-Feintuning pro Modus (NEU — bitte testen)
Einstellungen → Ansicht → Modus wählen, direkt darunter erscheinen die passenden Regler:
- [ ] **Wall**: Regler **Spalten** (Auto / 1–6) ändert die Spaltenzahl
- [ ] **Slices**: **Neigung** (0–20°) und **Streifenhöhe** wirken live
- [ ] **Geometric**: **Wabengröße** (Auto / px) ändert die Hex-Größe
- [ ] **Depth**: **Neigung** (0–20°) kippt die Karten mehr/weniger
- [ ] **Card hand**: **Fächerung** (2–16°) spreizt die Karten
- [ ] Regler stehen nur beim jeweils aktiven Modus; Werte bleiben nach Reload

## 10. Persistenz
- [x] Hochladen → App neu laden → Bild noch da
- [x] Favoriten / Tags / Einstellungen bleiben nach Reload
- [ ] **Nach Reload landet man wieder im Wallpaper-Tab** (nicht auf der Startseite) — offener/aktiver Tab wird gemerkt

## 12. Bugfixes 08.10. (bitte testen)
- [ ] **Doppelte-ID-Crash behoben**: Handy zeigt die Wallpaper wieder (kein rotes Fehlerfeld)
- [ ] **Swipe-Leiste**: Leiste öffnen, Finger ganz woanders hinziehen und loslassen → **nichts** passiert (kein versehentliches Auslösen)
- [ ] Swipe wie gehabt: Finger auf einem Icon loslassen → löst aus; zurück auf die Leiste ziehen → wählt wieder

## 13. Block A — neue Features (bitte testen)

### A1 Tag-Filter-Chips
- [ ] Rail → Suche öffnen → unter dem Suchfeld erscheint **„Nach Tags filtern"** mit Chips aller vergebenen Tags
- [ ] Chip antippen → Galerie zeigt nur Wallpaper mit diesem Tag; mehrere Chips = nur Wallpaper mit **allen** gewählten Tags
- [ ] Chip nochmal antippen → Filter weg; „Filter zurücksetzen" räumt auch Tags mit auf
- [ ] Tag-Filter wirkt zusammen mit Farb-/Favoriten-/Textsuche

### A2 Sammlungen / Playlists
- [ ] Oben in der Galerie erscheint eine **Sammlungs-Leiste** (nur wenn Sammlungen existieren) mit „Alle" + Chips
- [ ] **＋** in der Leiste → Name eingeben + Enter → neue Sammlung wird angelegt und aktiv
- [ ] Sammlung-Chip antippen → Galerie zeigt nur deren Wallpaper; „Alle" zeigt wieder alles
- [ ] Flip-Karte (lange drücken) → Abschnitt **Sammlungen**: Chips zum Zu-/Wegnehmen; **＋ Neu** legt Sammlung an und fügt das Bild hinzu
- [ ] Chip zeigt die Anzahl enthaltener Wallpaper
- [ ] Automatischer Wechsel wechselt nur innerhalb der aktiven Sammlung
- [ ] Bild löschen → verschwindet auch aus allen Sammlungen

### A3 Zeit-Scheduling
- [ ] Einstellungen → **Zeitplan** → Schalter an → **＋ Regel hinzufügen** erscheint
- [ ] Regel: Uhrzeit wählen + Zieltyp (🎲 Zufällig / 📁 Sammlung / 🖼 Bild) + × zum Löschen
- [ ] Zieltyp **Bild** → „🖼 Bild wählen" öffnet die **echte Bilderansicht** (Thumbnails) mit Suche + Favoriten + Farb- + Tag-Filtern; Bild antippen wählt es aus (gewähltes Bild wird als Mini-Vorschau + Name angezeigt)
- [ ] Zieltyp **Sammlung** → Sammlung aus Liste wählen
- [ ] Zur eingestellten Uhrzeit wechselt das Wallpaper automatisch aufs Ziel (Test z. B. mit Uhrzeit = jetzt+1 Min)
- [ ] Bei „Sammlung" wird die Sammlung aktiv + erstes Bild gesetzt; bei „Zufällig" ein zufälliges
- [ ] Mehrere Regeln möglich (z. B. Tag 08:00 / Nacht 20:00); feuert pro Regel einmal am Tag

### A4 Theme-Designer-Ausbau
- [ ] Einstellungen → Erscheinungsbild → **Kontrast**-Regler (−100%…+100%) ändert den App-Kontrast live
- [ ] **Theme-Presets**: „Aktuelles Theme speichern als…" + Name → Preset erscheint als Chip
- [ ] Preset-Chip antippen → Theme (Farbcharakter/Finish/Palette/Seed/Kontrast) wird angewendet; × löscht
- [ ] **Exportieren** zeigt das JSON; **Importieren** → JSON einfügen → „Import bestätigen" fügt Presets hinzu
- [ ] Presets + Kontrast bleiben nach Reload erhalten

### A5 Politur & Konsistenz
- [ ] Leere Zustände sauber (keine Wallpaper / keine Treffer)
- [ ] Keine ungenutzten/kaputten Stellen; App fühlt sich rund an
- [ ] Bedienung per Tastatur/Fokus grundlegend möglich (Rail/Buttons)

## 14. SKWD-Abschluss-Features (bitte testen)

### Sortierung (erweitert)
- [ ] Rail → Sortieren → Flyout zeigt: Neueste, Älteste, Name A–Z, Name Z–A, **Regenbogen**, Farbe hell→dunkel, Farbe dunkel→hell, Favoriten zuerst, Zufällig
- [ ] **Regenbogen**: Wallpaper nach Farbton sortiert (oben Rot → Orange/Gelb/Grün/Blau/Lila nach unten); Graustufen/ohne Akzent ans Ende
- [ ] „Favoriten zuerst" schiebt Favoriten nach oben
- [ ] „Zufällig" mischt; nochmal „Zufällig" wählen = neu mischen

### Hell/Dunkel in der Leiste
- [ ] Rail hat einen Eintrag **Hell/Dunkel** (Sonne/Mond/Auto-Icon)
- [ ] Antippen wechselt Auto → Hell → Dunkel → Auto; Icon ändert sich mit

### Medien-Filter (in der Leiste) + Videos
- [ ] Medien-Filter ist **ganz oben in der Rail** (Film-Symbol) → rüberswipen öffnet eine **zweite Swipe-Leiste** mit Alle / Bilder / Videos (+ Wallpaper Engine nur auf PC)
- [ ] Auswahl per Swipe; „Alle" ganz oben; Rail-Symbol ist aktiv markiert, wenn nicht „Alle"
- [ ] **Wallpaper Engine erscheint NICHT** auf Handy/Web (nur im Desktop-/PC-Build)
- [ ] Upload (Rail → ＋ → Hochladen) nimmt jetzt auch **Videodateien** an
- [ ] Videos erscheinen als Kachel mit ▶-Badge; „Videos" zeigt nur Videos, „Bilder" nur Bilder
- [ ] Video als aktiv wählen → läuft als **bewegter In-App-Hintergrund** (stumm, Schleife)
- [ ] Hinweis: Video als **System**-Hintergrund (Handy) kommt mit dem Live-Wallpaper-Block (B)

## 15. Block B — Live-Wallpaper (nativ, braucht APK-Rebuild + Gerät)
*Code gebaut; wird erst nach einem APK-Rebuild von Jonas testbar.*
*Fix 08.10.: Live-Wallpaper war schwarz → (a) Medium wird jetzt auch beim App-Start an den Dienst geschoben, (b) `registerReceiver` mit Android-14-Flag (sonst Crash im Dienst → schwarz). Braucht die neue APK.*
*Fix 08.10. (2): App hing (ANR) beim Start → großes Wallhaven-Bild als base64 über die Bridge blockierte den Thread. Jetzt: Bild vor dem Übertragen auf max 1920px runterskaliert + Push 2s verzögert + Videos vorerst übersprungen. Rein Web — nur App neu öffnen.*
- [ ] App startet ohne „reagiert nicht"-Dialog (ANR behoben)
- [ ] Beim Wallpaper-Wechsel wird man NICHT mehr aus der App geworfen
- [ ] Übergang beim Wechsel ist wieder sichtbar (In-App + Crossfade am System-Hintergrund)

### Video-Live-Wallpaper (NEU — gechunkter Datei-Transfer, braucht neue APK)
- [ ] Video als aktiv wählen (Live-Wallpaper an) → nach kurzem Moment läuft das **Video als bewegter System-Hintergrund** (stumm, Schleife)
- [ ] Übertragung blockiert die App nicht (läuft in Häppchen im Hintergrund)

### Live-Wallpaper: kein Rauswurf + native Rotation (NEU, braucht neue APK)
- [ ] Mit Live-Wallpaper an wird beim Wechsel **kein statisches Bild mehr gesetzt** → keine „Bild wurde gesetzt"-Meldung, **kein Sprung zum Homescreen**
- [ ] Auto-Wechsel an + Intervall (z. B. 10 s) → **der Homescreen-Hintergrund wechselt von selbst**, auch wenn die App geschlossen ist (solange der Homescreen sichtbar ist)
- [ ] Wechsel am Homescreen läuft mit Crossfade
- [ ] „Nur Favoriten" / aktive Sammlung begrenzen auch den rotierenden Pool

### Live-Wallpaper Feinschliff 08.10. (braucht neue APK)
- [ ] Rotation **springt nicht mehr zum ersten Bild** zurück, wenn man zum Homescreen zurückkehrt (macht da weiter, wo sie war)
- [ ] Übergang ist flüssig (vorskaliert) und das vorige Bild schimmert nicht mehr durch
- [ ] Mit Live an + **Auto-Wechsel aus**: ein Bild in der App antippen → **Homescreen folgt** (nach ~0,3 s, mit Crossfade)
- [ ] Mit Live an ist der statische „Als Hintergrund setzen"-Knopf **ausgeblendet** (der würde das Live-Wallpaper abschalten)

### Live-Wallpaper: Übergänge am Homescreen (braucht neue APK)
- [ ] Gewählter Übergang greift jetzt am **Homescreen**: Überblenden / Schieben / Zoom / Wischen sichtbar unterschiedlich
- [ ] Übergangs-Dauer (Einstellungen) wirkt auch am Homescreen
- [ ] Hinweis: die **GPU-Übergänge** (Warp/Morph/Pixel …) fallen am Homescreen noch auf Überblenden zurück (echter GL-Renderer im Dienst = späterer Block)

### (3) GPU-Übergänge am Homescreen — nativer OpenGL-Renderer (NEU, 1. Iteration, braucht neue APK)
*Live-Dienst komplett auf OpenGL ES 2.0 umgebaut; alle Web-Shader (12 GPU + fade/slide/zoom/wipe) nach GL ES portiert. Erste Version — kann Gerät-Macken haben, bitte genau hinsehen.*
- [ ] Bild steht richtig herum (nicht gespiegelt/auf dem Kopf), füllt den Schirm (cover)
- [ ] Standard-Übergänge (Überblenden/Schieben/Zoom/Wischen) laufen flüssig am Homescreen
- [ ] **GPU-Übergänge** (Warp/Morph/Pixel/Traum/Welle/Wirbel/Iris/Punkte/Wind/Streifen/Schraffur) laufen jetzt auch am Homescreen
- [ ] **Video**-Live-Wallpaper läuft weiter (richtig orientiert, stumm, Schleife)
- [ ] Rotation + „nicht zum ersten Bild zurückspringen" weiterhin ok
- [ ] Nach APK-Rebuild: Einstellungen → Geräte → **Live-Wallpaper** an → Button **„Als Handy-Hintergrund aktivieren…"**
- [ ] Button öffnet Androids Live-Wallpaper-Auswahl mit **„SKWD Wall"** → auswählen/setzen
- [ ] Aktives Wallpaper in der App wechseln → **System-Hintergrund folgt automatisch**
- [ ] Bildwechsel am System-Hintergrund läuft mit **Crossfade** (nicht hart)
- [ ] **Video** als aktiv wählen → läuft als bewegter System-Hintergrund (stumm, Schleife)
- [ ] Auto-Wechsel / Zeitplan wechseln auch den Live-Hintergrund mit

## 16. Orbit-Umbau + SKWD-Einstellungen + Papierkorb (bitte testen)
*Projekt heißt jetzt „Orbit", Plugin „SKWD Wall". Alle Einstellungen laufen über ein
einheitliches Settings-System. Reine Web-/Struktur-Änderungen → nur App neu laden.*

### Einheitliches Aussehen
- [ ] Alle Einstellungen sehen gleich aus (Name links, Bedienelement rechts)
- [ ] Menüpunkt heißt „SKWD Wall"; Mobile-Menü sitzt nicht mehr unter Statusleiste/Gestenbalken

### Neue Einstellungen
- [ ] Ansicht → pro Modus die passenden Regler (Wall-Spalten; Slices Neigung/Höhe/**Featured**; **Hex: Wabengröße/Reihen/Spalten/Scroll-Schritt/Bogen/Bogen-Intensität**; Depth-Neigung; Hand-Fächerung)
- [ ] **Geometrie-Presets C1–C4**: leeres C tippen speichert die aktuelle Geometrie, gefülltes wendet an, × löscht
- [ ] Video: **Stummschalten** + **Lautstärke**
- [ ] Wallpaper: **Neue Wallpaper auto-umfärben** + **Umfärb-Palette** (App-Theme/Catppuccin/Gruvbox/Nord) → beim Hochladen entsteht eine umgefärbte Kopie
- [ ] Übergang: **Zufalls-Shader pro Wechsel** (statt fester Typ)
- [ ] Automatischer Wechsel: **Bilder/Videos einschließen**
- [ ] Verhalten: **Beim Antippen schließen**, **Filterleiste immer zeigen**, **Suchleiste immer zeigen**
- [ ] Wallhaven: **Spalten** wirken im Online-Raster; **API-Key** gespeichert (NSFW-Freischaltung folgt)

### Papierkorb
- [ ] Wallpaper löschen (Flip-Karte → Löschen) → landet im **Papierkorb** (Einstellungen → Papierkorb) statt endgültig weg
- [ ] Papierkorb: **Wiederherstellen** holt es zurück; **Löschen** entfernt endgültig; **Papierkorb leeren**
- [ ] „Automatisch endgültig löschen" + Aufbewahrungstage (räumt alte beim App-Start)

### View-Fixes (NEU, bitte genau ansehen — erste Version)
- [ ] **Hex**: scrollt **horizontal**, Waben in **fester Reihenzahl**, bei „Bogen" an krümmen sie sich und **blenden am Rand aus** (Intensität/Größe regelbar)
- [ ] **Slices**: mit „Großes Bild in der Mitte" wird das aktive Bild größer hervorgehoben
- [ ] (Depth/Sandy/Hand/Collection bewusst erstmal gelassen — „egal")

### 17. Hex vertikal + Einstellungs-Reiter (bitte testen)
- [ ] **Hex scrollt vertikal** (hoch/runter), lässt sich wieder scrollen
- [ ] Mit „Bogen": Waben **krümmen sich** + werden zum Rand kleiner und blenden oben/unten aus (Kurve aus dem SKWD-Original adaptiert)
- [ ] Einstellungen haben jetzt **Reiter/Kategorien** oben (Ansicht · Darstellung · Automatik · Verhalten · Quellen · Daten) — nicht mehr ein langer Scroll
- [ ] Reiter wechseln zeigt nur die jeweilige Kategorie

### 23. Speicher-Backend Teil 2: nativer Ordnerzugriff am Handy (SAF) — braucht APK-Rebuild
*Native Android-Ordnerwahl (Storage Access Framework). **Neuer nativer Code → APK
muss neu gebaut + installiert werden** (Web-Reload reicht NICHT). Bis dahin scheitert
das Ordner-Wählen am Handy still.*
- [ ] Nach APK-Rebuild: Einstellungen → Quellen → Ordner → **„＋ Bilder-Ordner"** öffnet Androids Ordner-Auswahl
- [ ] Gewählter Ordner: Bilder/Videos erscheinen in der Galerie (direkt vom Ordner, nichts kopiert)
- [ ] Nur sichtbare Bilder werden geladen (großer Ordner ruckelt/überlastet nicht)
- [ ] Zugriff bleibt nach App-Neustart erhalten (SAF-Dauerberechtigung) — „Verbinden" sollte sofort grün sein
- [ ] Video-Ordner analog

### 22. Speicher-Backend: Ordner direkt nutzen (Teil 1, Web/PC — bitte testen)
*Einstellungen → Quellen → **Ordner**. Erster Teil der Speicher-Arbeit: echte
Ordner einbinden, OHNE hochzuladen. Funktioniert am **PC (Chrome/Edge)**; auf dem
Handy folgt der native Ordner-Zugriff (SAF) als eigener Block.*
- [ ] **„＋ Bilder-Ordner" / „＋ Video-Ordner"** öffnet den Ordner-Auswahldialog; die Medien erscheinen danach in der Galerie (nicht hochgeladen, bleiben im Ordner)
- [ ] Eingebundene Ordner werden mit Name + Anzahl gelistet; **Entfernen** nimmt sie (und ihre Bilder) wieder raus
- [ ] Nach App-Neustart: Ordner zeigt „getrennt" → **Verbinden** bestätigt den Zugriff neu, Bilder sind wieder da
- [ ] In Browsern ohne Ordner-Zugriff (z. B. Handy-App aktuell) steht ein Hinweis „Hochladen nutzen" statt der Buttons

### 21. Platz oben + Card-Hand-Verschieben
- [x] **Einstellungen & „Wallpaper hinzufügen": weniger Leerraum oben** — die Überschrift sitzt jetzt direkt unter der SKWD-Wall-Leiste (doppelte Safe-Area war schuld)
- [x] **Card Hand → „Fächer verschieben (horizontal)"** — schiebt den ganzen Kartenfächer nach links/rechts

### 20. Fehlbedienung + 2 neue View-Regler (bitte testen)
- [ ] **Öffnen der Einstellungen schaltet nichts aus Versehen** — die ersten ~0,3 s nach dem Öffnen reagieren Schalter/Regler nicht (das Zahnrad liegt über dem „Suchleiste immer"-Schalter)
- [ ] **Regler verstellt sich beim Scrollen NICHT mehr** — Finger auf den Schiebebalken + hoch/runter ziehen = die Liste scrollt, der Wert bleibt; nur **seitliches** Ziehen oder gezieltes Tippen ändert ihn
- [ ] **Sandy → „Kleine Bilder" Links/Rechts** — stellt ein, auf welcher Seite die Thumbnail-Spalte sitzt
- [ ] **Hex → „Ausblenden ab Rand"** (bei Bogen an) — regelt, ab wo die Waben oben/unten anfangen auszublenden (kleiner = früher/weiter innen)

### 19. Durchblättern + Einstellungen scroll-sicher (bitte testen)
- [ ] **Slices/Depth/Sandy/Hand/Collection: durchblättern** — vertikal wischen (Handy) bzw. Mausrad (PC) blättert schnell durch die Bilder; der Fokus/Mitte wandert mit
- [ ] Danach **Antippen wählt aus** (wird zum aktiven Wallpaper); nach einem Wisch löst das Loslassen NICHT versehentlich eine Auswahl aus
- [ ] **Suchleiste ausblenden**: wenn „Suchleiste immer zeigen" an ist, hat die angedockte Leiste oben ein **×** — einmal tippen schaltet sie dauerhaft aus
- [ ] **Einstellungen scroll-sicher**: durch die Einstellungen scrollen, ohne dass Regler beim Berühren sofort verspringen (Regler reagieren nur auf seitliches Ziehen, vertikal = scrollen)

### 18. Ansichten komplett neu aus SKWD-Quellcode (bitte testen)
*Alle Modi außer Wall sind auf das **aktive Bild zentriert** (wie im SKWD-Original):
Nachbar antippen = wird zur Mitte, der Rest gleitet animiert nach. **Alles gleitet
vertikal (oben↔unten)**, nie horizontal. Reine Web-Änderung → nur neu laden.*
- [ ] **FREEZE weg**: In allen Modi (bes. Slices) öffnet die Swipe-Leiste wieder normal, nichts eingefroren
- [ ] **Hex: Streifen verschieben** (Ansicht → Regler) schiebt das ganze Wabenmuster horizontal zum Zentrieren
- [ ] **Slices**: aktives Bild groß in der Mitte, Nachbarn schmale Bänder **darüber/darunter**, Ränder blenden aus; Nachbar antippen = gleitet **vertikal** in die Mitte
- [ ] **Depth**: Tiefenstapel **vertikal** — aktives Bild groß mittig, nach oben/unten logarithmisch kleiner
- [ ] **Sandy**: großes Hero-Bild in der Mitte + **vertikale** Thumbnail-Spalte am Rand (gegenüber der Swipe-Leiste)
- [ ] **Hand**: Kartenfächer **vertikal** um das aktive Bild (Karten biegen seitlich aus)
- [ ] **Collection**: gekippter Kartenstapel, aktives Bild steht aufrecht groß vorn
- [ ] **Wall**: unverändert (sauberes Raster)
- [ ] Modus-Regler passen: Wall-Spalten · Hand-Fächerung · Hex (Spalten/Größe/Bogen/Verschieben); tote Regler (Slices-Neigung/Höhe/Featured, Depth-Neigung) sind raus

---

## Bekannte Kleinigkeiten
- Foto-Effekte waren bei großen Bildern leicht verpixelt → Grenze auf 4K erhöht (bitte erneut prüfen).
- **Video-Wallpaper in der App ruckelt (offen, später fixen):** Ein Video als
  Hintergrund **in der App** macht die ganze App dauerhaft ruckelig (auch das
  Hintergrundbild). Der **echte System-Hintergrund** (Home-/Sperrbildschirm, Live-
  Wallpaper) läuft dagegen **flüssig** — nur beim Aufwachen (dunkel → Sperrbildschirm)
  ganz kurz ein Mini-Ruckler, danach smooth. Jonas will aktuell keine bewegten
  Wallpaper, aber das In-App-Video-Rendering soll später entruckelt werden.

## Plan / Roadmap (SKWD aufs Handy → dann Sync)
**A. Rest SKWD-Features (Web-Arbeit, autonom, kein Rot/Hardware):**
- [x] Geräte-Bereich (Schiebe-Schalter Handy + Live-Wallpaper)
- [x] Layout-Feintuning pro Modus (Wall-Spalten, Slices-Neigung/Höhe, Hex-Größe, Depth-Neigung, Hand-Fächerung) → Test offen in §11

Großer Block „SKWD komplett (Web)" — in dieser Reihenfolge abarbeiten, jede
Teilaufgabe mit eigener Testliste hier in FEATURES.md, Build nach jedem Schritt grün:
- [x] **A1 Tag-Filter-Chips** — gebaut (Test §13/A1)
- [x] **A2 Sammlungen / Playlists** — gebaut (Test §13/A2)
- [x] **A3 Zeit-Scheduling** — gebaut (Test §13/A3)
- [x] **A4 Theme-Designer-Ausbau** — gebaut (Test §13/A4)
- [x] **A5 Politur & Konsistenz** — gebaut: ~35 tote CSS-Regeln raus (Warnungen 56→19), „Filter zurücksetzen" löst auch Sammlung, a11y-Kleinkram (Test §13/A5)

Autonomie: komplett Sojus. Jonas nur hinterher testen (Testlisten hier). Nichts „Rot".

**B. Nativer Block:**
- [ ] **Live-Wallpaper** (Kotlin `WallpaperService` + GL) — echte animierte System-Hintergründe; Schalter unter Geräte → Handy

**C. Danach:**
- [ ] **Sync PC ↔ Handy** (Sets/Wallpaper/Einstellungen synchronisieren)
- [ ] Desktop-Variante (Tauri): Windows / macOS / (Linux); Web geht immer
- [ ] Eigenständige APK ohne Dev-Server (Wallhaven braucht dann eigenen Proxy)
- [ ] App-Name festlegen (Platzhalter „KI-OS")
