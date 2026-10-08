# SKWD Wall — Analyse & Strategie-Entscheidung (07.10.2026)

## Kernerkenntnis

SKWD Wall ist **kein kleines Tool zum Nachbauen**, sondern ein großes, hochaktives
Open-Source-Projekt. Es zu duplizieren wäre Verschwendung. Wir **setzen oben drauf**.

## Fakten (belegt, GitHub)

- **Repo:** https://github.com/liixini/skwd-wall · **Lizenz:** GPL-3.0-or-later
- **1.048 ★**, sehr aktiv (letzter Push 01.10.2026, Version `1.0.0-beta.24`)
- **Zwei Generationen:** v1 = Quickshell/QML · **v2 (aktuell) = kompletter Rust-Rewrite**
  mit **iced + wgpu + Vulkan (ash)**. Default-Branch `v2`.
- **Repo-Verbund** (liixini): `skwd-wall` (Client-GUI), `skwd-deck` (Daemon-Suite:
  `skwd-walld`, `wall-proto`, `wall-rules`, `skwd-palette`, `skwd-steam` …),
  `skwd-paper` (eigener Wayland-Wallpaper-Daemon, Vulkan/wlr-layer-shell),
  `skwd-lens` (SigLIP2-Semantiksuche), `skwd` (QML-Shell).

### Was es HEUTE schon kann
- Wallpaper: **Bilder, Videos UND Wallpaper-Engine-Scenes**, pro Display konfigurierbar
- 4 GPU-Picker-Modi (Slices, Geometric/Hex, Wall, Sandy + Depth), **39 Übergänge**, Filter
- Quellen: Wallhaven, **Steam Workshop**, YouTube, Bing Daily
- **Scheduling** mit Bedingungslogik (Zeit/Datum/Sonne/Wetter/Akku/Power/Displays)
- Theming aus dem Wallpaper (eigene Engine `skwd-palette`, 50 Material-Rollen) +
  **Bridges** zu matugen/pywal/wallust/caelestia/noctalia
- Semantische Suche, Per-Workspace-Pinning (Hyprland/Niri/KWin, WIP)
- Setzt Wallpaper über **eigene Engine** (`skwd-paper`, Vulkan) — NICHT swww/hyprpaper

### Was ihm FEHLT = unser Projekt
- ❌ **Sync zwischen Geräten** (gar keine Netzwerk-Schnittstelle, nur lokale Unix-Sockets)
- ❌ **Handy / Mobile** (kein Zeile Mobile-Code)

### Technischer Aufsetzpunkt für Sync
- Client ↔ Daemon reden über **Unix-Domain-Socket, zeilenweise JSON/JSON-RPC**
  (Crate `wall-proto`: Request/Response + Server-Push-`Event`s). Transport ist in
  `infrastructure/ipc/` **sauber abstrahiert** (`Transport`-Enum) → ein **Netz-Transport
  daneben** ist der kleinste Eingriff.
- `skwd-paper` hat ein **JSON-Manifest** (`wallpapers.json`, pro Monitor) = fertiges
  Serialisierungsformat für „was läuft auf welchem Monitor".

## Entscheidung (07.10.2026)

**Option 1 — Aufsetzen statt nachbauen.** Bestätigt von Jonas (war ohnehin sein Plan).

- **PC-Seite:** skwd-wall **forken/erweitern** um Set-Konzept (Desktop- + Handy-Bild-Paar)
  + **Netzwerk-Schnittstelle für Sync**. Ziel: sauberer **Upstream-PR an liixini**
  (Jonas will dem Entwickler das Feature beitragen).
- **Handy-Seite:** **neu bauen** — die Rust/Vulkan-Codebasis läuft NICHT auf Android.
  Die neue Handy-App = **unser KI-OS** (Svelte/Capacitor) mit einem
  Wallpaper-/Theme-/Sync-Plugin. (Ersetzt den alten „Kotlin-Launcher"-Plan aus PLAN.md
  Teil 3 — jetzt vereinheitlicht auf die eine KI-OS-Codebasis.)
- **Verbindung:** Sync-Protokoll, das zu `wall-proto` passt (JSON über Netz-Transport).

## GUI-Vision (Jonas, 07.10.)

Das Frontend soll **wie SKWD Wall aussehen** (die verschiedenen Picker-Modi) — das bauen
wir in unserem KI-OS selbst, unabhängig von der Render-Engine. Mobile-Anpassungen:
- **Vertikal scrollen** (oben↔unten) statt horizontal — Hochformat
- **Menü** (bei SKWD Wall oben) sitzt am Handy **rechts**, für Linkshänder auf **links** umstellbar
- **Rand-aktiviert:** Menü klappt nur aus, wenn der Finger an den Rand kommt — sonst hat
  das Wallpaper die volle Fläche. (Knüpft an das Gesten-/Input-System an.)

## Android-Portierbarkeit der Engine (07.10.2026, Code geprüft)

**Es gibt ZWEI Renderer — getrennt bewerten:**
1. **Picker/GUI-Renderer** (in `skwd-wall`): **wgpu + iced + WGSL-Shader**. Technisch
   Android-fähig (wgpu/winit/android-activity liegen schon transitiv im Cargo.lock),
   ABER (a) nicht als Bibliothek herausgelöst — fest ins App-Binary über iced
   `update`/`view` verwoben, (b) iced-auf-Android ist unerprobt. → praktisch Neubau.
2. **Wallpaper-Renderer** (in `skwd-paper`/`paper-vk`): **direktes ash/Vulkan +
   wlr-layer-shell + ffmpeg + dbus**. Für Android **Totalverlust** — muss gegen
   Androids `WallpaperService` neu gebaut werden.

**Wiederverwendbar als Android-Lib (~20–30 %, hohe Konfidenz, reines Rust):**
`wall-proto` (Sync-Protokoll), `wall-rules` (Scheduling), `skwd-palette` (Farb-/Theming-
Engine), `skwd-config`, `paper-geom`, `paper-shaders`, `skwd-wall-effects` (CPU-Bild-
Effekte). **Plus die `shaders/*.wgsl`** und der Übergangs-Katalog (`wall-proto/transitions.rs`,
6 Familien/39 benannte Übergänge) als Daten.

**GLÜCKSFALL:** Die Shader sind **WGSL** = exakt die Shader-Sprache von **WebGPU**.
→ Wir können die Picker-Effekte/Übergänge in unserem **Web-Frontend (Svelte + WebGPU)**
nachempfinden und die Original-Shader großteils direkt wiederverwenden — **ohne**
Rust-auf-Android/NDK-Cross-Compile-Gefummel. Umgeht die größten Risiken.

**Fällt am Handy weg:** Steam Workshop (`steamworks`), echte Wallpaper-Engine-Scenes
(`paper-scene`: JS-Engine + HLSL-Compiler), Multi-Monitor, der ganze Daemon.

**Konsequenz für den Plan (bestätigt):** Handy-GUI **neu in Svelte/Capacitor** (wollten
wir eh). Wiederverwenden: **Logik-Crates + WGSL-Shader**, NICHT den Renderer. Android-
Wallpaper-Setzen neu via `WallpaperService`. Die „komplette Maschine rüberheben" geht
NICHT — der eigentliche Wallpaper-Maler ist Linux-Desktop-only.

## UI- & Aussehen-Spezifikation (07.10.2026, Code geprüft) — für den Mobile-Nachbau

**Zwei Leisten, nicht eine:**
- **Filter-Bar** (Hauptleiste, `src/frontend/ui/bar/`): **schräge Parallelogramm-Leiste** aus
  skewed Buttons. Reihenfolge: Typ-Chips (ALL/PIC/VID/WE) · Form (Shape/Wide/Tall) ·
  Auflösung · Ordner▾ · 7 Sort-Buttons · Favoriten♥ · Random⟳ · 12 Farb-Swatches ·
  Theme-Toggle · Suche/Tags · Download · Audio · Playlists · Settings⚙ · Stash(Hide) ·
  Task-Chips. Nerd-Font-Glyphen, kurze GROSSE Labels.
  - **Schon konfigurierbar (passt zu Jonas' Spec!):** Orientation Horizontal/**Vertical**
    (`verticalize_bar()`), Offset, **Always-visible aus = Auto-Hide**, Visual-style
    (Leiste nimmt Optik des aktiven Picker-Modus an).
- **Theme-Bar** (`theme_bar/`): Schnell-Panel für Farben.

**7 Picker-Modi** (`contracts/picker/mode.rs`), UI-Labels: **Slices · Depth ·
Geometric**(=Hex) **· Wall**(=Grid) **· Sandy · Card hand · Collection**. Jeder Modus
hat eigene Composition-Sliders + eigene gespeicherte Presets („Styles").

**Aussehen-Einstellungen (13 Tabs im Original → 5 sinnvolle Mobile-Kategorien):**
- **A Picker/Layout:** Modus-Wahl; pro Modus Kartengröße/Spalten/Zeilen/Abstände/
  Eckenradius/Skew/Wobble/Bend, Effekt-Layer (Schatten/Backdrop-Blur/Ghosts/Bob/Parallax),
  Card-Flip; Type-Badges; Video-Preview; Hover-Theme-Preview; **UI-Scale 0.5–2.0**.
- **B Theme:** **Mode Dark/Light/Auto**(+OLED) · **Scheme-Character** (9: Tonal spot,
  Vibrant, Expressive, Neutral, Monochrome, Fidelity, Content, Rainbow, Fruit salad —
  entsprechen material-color-utilities Scheme*!) · **Finish** (Natural/Pastel/Muted/Vibrant) ·
  **Palette-Behaviour** (Follow wallpaper/Fixed/Keep) · Theme-Designer (Material-Rollen,
  Custom-Seed-Hex) · **Hintergrund** (Farbe/Blur hinter den Karten).
- **C Filter/Suche:** Typ, Form(Portrait!), Auflösung, Ordner, Favoriten, Farbe,
  Tags/Semantiksuche, Wetter, Sort(7), Sticky; Bar-Position/Auto-Hide.
- **D Motion/Transitions:** Enable, Duration, FPS; Familie (Fade/Wipe/Warp/Break/Sand/
  Random) → 1 von 39 Übergängen. WGSL-Shader in `shaders/transition.wgsl`+`sandy.wgsl`
  → direkt für WebGPU (Block 3).
- **E Effekte:** 12 stapelbare Foto-Filter (nur statische Bilder).

**Mobile-Cut:** Weg fällt alles Multi-Monitor/pro-Display, Steam Workshop,
Wallpaper-Engine-Scenes, Desktop-Color-Backends (matugen/pywal…→Android-Monet/eigene
Engine), Compositor-Pinning, Keybindings, Post-Apply-Shell, Performance/VRAM-Tab.

## Wichtig für den Upstream-PR

- **GPL-3.0** beachten (Fork bleibt GPL).
- **Zuerst mit dem Maintainer reden** (Issue/Discussion: „Würde Cross-Device-Sync +
  Mobile-Gegenstelle beisteuern — Interesse, und wie soll der Transport aussehen?")
  BEVOR ein großer Feature-PR gebaut wird. Schützt Jonas' Zeit vor Ablehnung.
- Code-Stil von liixini treffen (Rust Edition 2024, feingranulare Module, begleitende
  `*_tests.rs`/proptest, Namen tragen die Doku, wenig Kommentare).
