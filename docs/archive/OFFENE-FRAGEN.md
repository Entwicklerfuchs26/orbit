# Offene Fragen / Entscheidungen vor dem Start

## skwd-wall (Teil 1+2)
- [ ] Repo-URL, Lizenz, und wie läuft der Upstream-PR-Prozess bei liixini?
- [ ] Welche Farb-Engine nutzt skwd-wall schon — **Matugen oder Pywal**? (Nicht doppelt bauen.)
- [ ] Sync-Transport: **KDE Connect (D-Bus)** vs. **eigener HTTP/WS-Server**?
      - KDE Connect: TLS + Pairing geschenkt, aber Custom-Pakete/Plugin nötig.
      - HTTP/WS: volle Kontrolle, aber Auth/TLS selbst bauen.
- [ ] NixOS: Fork als eigenes Flake + Dev-Shell (Rust-Toolchain + Qt6/Quickshell). Build reproduzierbar?

## Android Launcher (Teil 3)
- [ ] KDE-Connect-Protokoll auf Android: bestehende Lib nutzen oder Custom-Paket-Teil selbst?
      (Das offizielle KDE Connect Android ist GPL — Protokoll nachbauen vs. drauf aufsetzen.)
- [ ] KI-Endpunkt fürs Overlay: **Ollama lokal auf dem Handy** (schwergewichtig) oder
      **remote an darwin26** (Sojus/Hermes :3002 über WireGuard, schon vorhanden)?
      → verbindet sich mit dem offenen „Remote-Zugriff per WireGuard"-Thema.
- [ ] Launcher-Scope: minimaler Home + App-Drawer zuerst, Sync + Overlay als Module danach.

## Grundsätze (aus fuchs' Arbeitsweise)
- Deklarativ (NixOS-Flake) statt Skript-Gebastel.
- Datenschutz/Privacy: KI-/Netzwerk-Code hinter Schalter, Standard AUS (GrapheneOS-Geist).
- Erst Zeiteinschätzung + Autonomie/Rot-Anteil pro Teilaufgabe festlegen, bevor gebaut wird.
