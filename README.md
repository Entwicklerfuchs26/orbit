# skwd-wall-sync — Theme-/Wallpaper-Ökosystem Desktop ↔ Handy

**Status:** Idee / Planung (angelegt 05.10.2026). Konzept mit Gemini erarbeitet, hier strukturiert festgehalten.

## Vision
Ein **"Set"** = zusammengehöriges Theme: ein Querformat-Bild (Desktop, 16:9) + ein
Hochformat-Bild (Handy, 9:16) + Hell/Dunkel-Präferenz. Ein Set wechseln → **Desktop
UND Handy** ziehen synchron das passende Wallpaper + generieren dazu die Farben.

## Zwei zusammenhängende Open-Source-Projekte
1. **skwd-wall erweitern** (Linux/NixOS) — der bestehende Wallpaper-Tool von *liixini*
   (Quickshell/QML-UI + Rust-Backend) bekommt Set-Datenmodell, "Sets"-Reiter im UI
   und eine Netzwerk-Schnittstelle für Sync. Ziel: sauberer **Upstream-PR**.
2. **Custom Android Launcher** (Kotlin, GrapheneOS) — eigenständiger Launcher, der
   per **KDE Connect** Set-Wechsel empfängt, das Hochformat-Bild als Wallpaper setzt,
   und optional ein KI-Chat-Overlay bietet.

## Anknüpfung an bestehende Infra (fuchs)
- **Lokaler KI-Endpunkt** fürs Chat-Overlay: statt Ollama könnte Sojus/Hermes dienen
  (OpenAI-kompatibel auf `darwin26:3002`), erreichbar vom Handy über **WireGuard**.
  (Hängt am gleichen „Remote-Zugriff"-Thema wie Audio/Suche.)
- **NixOS:** skwd-wall-Fork als eigenes Flake + Dev-Shell (Rust + Qt/Quickshell).
- **KDE Connect** läuft im Heimnetz (TLS + Pairing geschenkt) → als Sync-Transport prüfen.

## Dateien
- `PLAN.md` — detaillierter 3-Teile-Umsetzungsplan (aus dem Gemini-Konzept).
- `OFFENE-FRAGEN.md` — zu klärende Entscheidungen vor dem Start.
