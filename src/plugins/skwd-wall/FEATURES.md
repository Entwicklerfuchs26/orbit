# SKWD Wall — Feature- & Test-Checkliste

Plugin-eigene Testliste (Kern-Tests stehen in der Orbit-`FEATURES.md`).
`- [x]` = von Jonas bestätigt. `- [ ]` = offen. [nativ] = braucht APK-Rebuild + Gerät.

---

## 1. Wallpaper hinzufügen (➕ „Hinzufügen")
- [x] Rail → ➕ → Vollbild-Overlay mit Tabs **Hochladen / Online**
- [x] **Hochladen**: Bilder vom Gerät wählen → erscheinen in der Galerie
- [x] **Online (Wallhaven)**: Vorschläge laden automatisch; Suche + Enter → Treffer
- [x] Filter-Knopf klappt Filter auf/zu; Sortierung/Kategorie/Seitenverhältnis wirken
- [x] Weit runterscrollen lädt mehr nach (Pagination)
- [x] Bild antippen → Vollbild-Vorschau + unten **Herunterladen**

## 2. Galerie / Ansichts-Modi
- [x] Wall / Geometric (Waben) / Slices / Depth / Sandy / Card hand / Collection
- [x] Vertikal scrollbar; aktives Wallpaper markiert
- [x] Modus-Wechsel über Einstellungen → Ansicht

## 3. Theming (ganze App folgt dem Wallpaper)
- [x] Neues Wallpaper → App-Farben passen sich an
- [x] Farbcharakter (9) / Finish / Palette (Wallpaper/fest/beibehalten) / Modus Hell-Dunkel-Auto / UI-Größe

## 4. Vertikale Swipe-Leiste (Rail)
- [x] Rand antippen → Leiste fährt rein (schräges Parallelogramm); fährt von selbst wieder ein
- [x] Finger hoch/runter → Icon hervorgehoben (Label-Fähnchen); loslassen löst aus
- [x] Farbe: Regenbogen-Sub-Leiste (schwebend), swipen wählt, nochmal = aus
- [x] Sortieren-Sub-Leiste; Favoriten / Zufall / Suche

## 5. Flip-Karte (langes Drücken)
- [x] Lange halten → flippt zur Rückseite
- [x] Favorisieren (Stern) → Herzchen auf der Kachel
- [x] **Tags**: Tag + Enter → Chip; × entfernt; Suche findet nach Tag
- [x] **Effekt** → Umfärben/Graustufen/Sepia/Poster/Invertiert → Vorschau → „Als neues Wallpaper speichern"
- [x] Löschen / Fertig

## 6. Übergänge
- [x] CSS (Überblenden/Schieben/Zoom/Wischen) + GPU/WebGL (Warp/Morph/Pixel/Traum/Streifen/Welle/Wirbel/Iris/Punkte/Wind/Schraffur)

## 7. Einstellungen (⚙) — *noch durchzutesten*
- [ ] **Ansicht**: Modus wählen
- [ ] **Wallpaper → Anpassung**: Füllen/Einpassen/Strecken/Zentriert/Kacheln
- [ ] **Wallpaper → Abdunkeln**
- [ ] **Kacheln**: Größe + Eckenradius
- [ ] **Übergang beim Wechsel**: Typ + Dauer
- [ ] **Automatischer Wechsel**: An + Intervall + „nur Favoriten"
- [ ] Auto-Wechsel: **Systemhintergrund mitsetzen** (🏠/🔒)
- [ ] **Menü**: Seite, Verhalten, Ausblende-Zeit

## 8. Geräte
- [ ] Einstellungen → **Geräte** → **Handy (Android)** ist ein echter **Schiebe-Schalter**, kein Zweierbutton
- [ ] Handy **aus** → alle Handy-Funktionen verschwinden (Systemhintergrund, Auto-OS-Ziele, Live-Wallpaper); App = reine Web-/In-App-Ansicht
- [ ] Handy **an** → Handy-Funktionen wieder da
- [ ] Handy an → darunter **Live-Wallpaper**-Schiebe-Schalter sichtbar
- [ ] Auch „Automatischer Wechsel" ist ein Schiebe-Schalter

## 9. Layout-Feintuning pro Modus
Einstellungen → Ansicht → Modus wählen, direkt darunter die passenden Regler:
- [ ] **Wall**: Regler **Spalten** (Auto / 1–6)
- [ ] **Slices**: **Neigung** (0–20°) und **Streifenhöhe** live
- [ ] **Geometric**: **Wabengröße** (Auto / px)
- [ ] **Depth**: **Neigung** (0–20°)
- [ ] **Card hand**: **Fächerung** (2–16°)
- [ ] Regler stehen nur beim aktiven Modus; Werte bleiben nach Reload

## 10. Persistenz
- [x] Hochladen → App neu laden → Bild noch da
- [x] Favoriten / Tags / Einstellungen bleiben nach Reload
- [ ] Nach Reload wieder im Wallpaper-Tab (offener/aktiver Tab gemerkt)

## 11. Bugfixes 08.10.
- [ ] **Doppelte-ID-Crash behoben**: Handy zeigt die Wallpaper wieder (kein rotes Fehlerfeld)
- [ ] **Swipe-Leiste**: öffnen, Finger woanders hinziehen + loslassen → **nichts** passiert
- [ ] Swipe wie gehabt: auf einem Icon loslassen → löst aus; zurück auf die Leiste ziehen → wählt wieder

## 12. Block A — Features

### A1 Tag-Filter-Chips
- [ ] Rail → Suche → **„Nach Tags filtern"** mit Chips aller Tags
- [ ] Chip antippen → nur Wallpaper mit diesem Tag; mehrere = nur mit **allen** Tags
- [ ] Chip nochmal → Filter weg; „Filter zurücksetzen" räumt Tags mit auf
- [ ] Tag-Filter wirkt mit Farb-/Favoriten-/Textsuche zusammen

### A2 Sammlungen / Playlists
- [ ] **Sammlungs-Leiste** oben (nur wenn Sammlungen existieren) mit „Alle" + Chips
- [ ] **＋** → Name + Enter → neue Sammlung, aktiv
- [ ] Sammlung-Chip → nur deren Wallpaper; „Alle" zeigt alles
- [ ] Flip-Karte → Abschnitt **Sammlungen**: Chips zum Zu-/Wegnehmen; **＋ Neu**
- [ ] Chip zeigt Anzahl; Auto-Wechsel wechselt nur in der aktiven Sammlung
- [ ] Bild löschen → verschwindet aus allen Sammlungen

### A3 Zeit-Scheduling
- [ ] Einstellungen → **Zeitplan** → Schalter an → **＋ Regel hinzufügen**
- [ ] Regel: Uhrzeit + Zieltyp (🎲 Zufällig / 📁 Sammlung / 🖼 Bild) + × löschen
- [ ] Zieltyp **Bild** → echte Bilderansicht (Thumbnails, Suche, Favoriten, Farb-/Tag-Filter); antippen wählt
- [ ] Zieltyp **Sammlung** → aus Liste wählen
- [ ] Zur Uhrzeit wechselt das Wallpaper automatisch (Test: jetzt+1 Min)
- [ ] „Sammlung" → aktiv + erstes Bild; „Zufällig" → zufälliges
- [ ] Mehrere Regeln; feuert pro Regel einmal am Tag

### A4 Theme-Designer-Ausbau
- [ ] Einstellungen → Erscheinungsbild → **Kontrast**-Regler (−100…+100%) live
- [ ] **Theme-Presets**: „Aktuelles Theme speichern als…" + Name → Chip
- [ ] Preset-Chip → Theme angewendet; × löscht
- [ ] **Exportieren** zeigt JSON; **Importieren** → JSON einfügen → „Import bestätigen"
- [ ] Presets + Kontrast bleiben nach Reload

### A5 Politur & Konsistenz
- [ ] Leere Zustände sauber (keine Wallpaper / keine Treffer)
- [ ] Keine ungenutzten/kaputten Stellen
- [ ] Tastatur/Fokus grundlegend bedienbar (Rail/Buttons)

## 13. SKWD-Abschluss-Features

### Sortierung (erweitert)
- [ ] Rail → Sortieren → Neueste, Älteste, Name A–Z/Z–A, **Regenbogen**, Farbe hell→dunkel/dunkel→hell, Favoriten zuerst, Zufällig
- [ ] **Regenbogen**: nach Farbton (Rot→Lila); Graustufen ans Ende
- [ ] „Favoriten zuerst"; „Zufällig" mischt (nochmal = neu mischen)

### Hell/Dunkel in der Leiste
- [ ] Rail-Eintrag **Hell/Dunkel** (Sonne/Mond/Auto); Antippen wechselt Auto → Hell → Dunkel → Auto

### Medien-Filter + Videos
- [ ] Medien-Filter ganz oben in der Rail (Film-Symbol) → zweite Swipe-Leiste Alle / Bilder / Videos (+ Wallpaper Engine nur PC)
- [ ] Auswahl per Swipe; Rail-Symbol markiert, wenn nicht „Alle"
- [ ] **Wallpaper Engine erscheint NICHT** auf Handy/Web
- [ ] Upload nimmt **Videodateien** an; Videos als Kachel mit ▶-Badge
- [ ] Video als aktiv → bewegter In-App-Hintergrund (stumm, Schleife)

## 14. Orbit-Umbau + Einstellungen + Papierkorb

### Einheitliches Aussehen
- [ ] Alle Einstellungen gleich (Name links, Bedienelement rechts)
- [ ] Menüpunkt „SKWD Wall"; Mobile-Menü nicht unter Statusleiste/Gestenbalken

### Neue Einstellungen
- [ ] Ansicht → pro Modus die Regler (Wall-Spalten; Slices Neigung/Höhe/**Featured**; **Hex: Wabengröße/Reihen/Spalten/Scroll-Schritt/Bogen/Bogen-Intensität**; Depth-Neigung; Hand-Fächerung)
- [ ] **Geometrie-Presets C1–C4**: leeres C speichert, gefülltes wendet an, × löscht
- [ ] Video: **Stummschalten** + **Lautstärke**
- [ ] Wallpaper: **Auto-umfärben** + **Umfärb-Palette** (App-Theme/Catppuccin/Gruvbox/Nord)
- [ ] Übergang: **Zufalls-Shader pro Wechsel**
- [ ] Automatischer Wechsel: **Bilder/Videos einschließen**
- [ ] Verhalten: **Beim Antippen schließen**, **Filterleiste immer**, **Suchleiste immer**
- [ ] Wallhaven: **Spalten** im Online-Raster; **API-Key** gespeichert

### Papierkorb
- [ ] Löschen → **Papierkorb** (Einstellungen → Papierkorb) statt endgültig
- [ ] **Wiederherstellen** / **Löschen** / **Papierkorb leeren**
- [ ] „Automatisch endgültig löschen" + Aufbewahrungstage

### Ansichten (neu aus SKWD-Quellcode) ✓ bestätigt
- [x] Alle Modi außer Wall aufs aktive Bild zentriert, alles vertikal, durchblätterbar
- [x] **Hex** vertikal + „Bogen" (krümmt + blendet am Rand aus); Streifen verschieben
- [x] **Slices** großes Bild mittig + „Featured"; **Depth** vertikaler Tiefenstapel
- [x] **Sandy** Hero + vertikale Thumb-Spalte (Seite wählbar); **Hand** vertikaler Fächer (+ Verschieben)
- [x] **Collection** gekippter Stapel; **Wall** unverändert
- [x] Durchblättern (Wisch/Mausrad) + Antippen wählt; kein Fehl-Auslösen nach Wisch
- [x] Einstellungen scroll-sicher (Regler nur bei seitlichem Ziehen); Settle-Guard gegen Fehl-Taps
- [x] Pro-Modus-Regler passen; tote Regler raus

## 15. Speicher-Backend (Ordner)

### Teil 1 (Web/PC) — Ordner direkt nutzen
- [ ] [Web] Einstellungen → Quellen → **„＋ Bilder-Ordner" / „＋ Video-Ordner"** → Medien erscheinen (nicht kopiert)
- [ ] Eingebundene Ordner mit Name + Anzahl; **Entfernen** nimmt sie raus
- [ ] Nach Neustart „getrennt" → **Verbinden** bestätigt Zugriff neu
- [ ] Browser ohne Ordner-Zugriff → Hinweis „Hochladen nutzen"

### Teil 2 (nativ Android SAF) ✓ bestätigt
- [x] [nativ] Quellen → Ordner → **„＋ Bilder-Ordner"** öffnet Androids Ordner-Auswahl
- [x] Gewählter Ordner: Bilder/Videos erscheinen (nichts kopiert)
- [x] Nur sichtbare Bilder geladen (großer Ordner ruckelt nicht)
- [x] Zugriff bleibt nach Neustart (SAF-Dauerberechtigung)
- [x] Video-Ordner analog

### Thumbnails ✓ bestätigt
- [x] [nativ] Ordner-Scrollen flüssig (kleine Thumbnails, nativ heruntergerechnet)
- [x] **Als Hintergrund setzen** nutzt volle Auflösung
- [x] Leerzustand: **Hochladen · Ordner verknüpfen · Online suchen**
- [x] Live-Wallpaper / Auto-Wechsel aus Ordner in voller Qualität

## 16. Live-Wallpaper (nativ, braucht APK-Rebuild + Gerät)
- [ ] [nativ] App startet ohne ANR; beim Wechsel kein Rauswurf; Übergang sichtbar
- [ ] [nativ] **Video-Live-Wallpaper** (gechunkter Transfer) läuft als bewegter System-Hintergrund (stumm, Schleife)
- [ ] [nativ] Mit Live an: kein statisches Bild/keine „gesetzt"-Meldung/kein Homescreen-Sprung
- [ ] [nativ] Auto-Wechsel → Homescreen wechselt von selbst (auch App zu); Crossfade; Pool durch „nur Favoriten"/Sammlung begrenzt
- [ ] [nativ] Rotation springt nicht zum ersten Bild zurück; Antippen in der App → Homescreen folgt (~0,3 s)
- [ ] [nativ] Statischer „Als Hintergrund"-Knopf bei Live an ausgeblendet
- [ ] [nativ] **GPU-Übergänge am Homescreen** (OpenGL ES 2.0): Bild richtig orientiert (cover); Standard- + GPU-Shader laufen; Video weiter ok
- [ ] [nativ] Button „Als Handy-Hintergrund aktivieren…" → Androids Live-Wallpaper-Auswahl „SKWD Wall"

## 17. Standalone (offen)
- [ ] [nativ] **Wallhaven eigenständig**: ohne Dev-Proxy (nativer Direkt-Abruf via CapacitorHttp)

---

## Bekannte Kleinigkeiten
- Foto-Effekte bei großen Bildern leicht verpixelt → Grenze auf 4K erhöht (bitte erneut prüfen).
- **Video-Wallpaper in der App ruckelt (offen):** Video als Hintergrund **in der App**
  macht die App dauerhaft ruckelig. Der echte System-/Live-Wallpaper läuft **flüssig**
  (nur beim Aufwachen kurz ein Mini-Ruckler). In-App-Video-Rendering soll später
  entruckelt werden.
