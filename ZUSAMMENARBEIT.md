# Zusammenarbeit — KI-Betriebssystem Projekt

## Rollen

- **Sojus (Claude Code):** Plant, baut, dokumentiert. Arbeitet autonom in Blöcken.
- **Jonas:** Entscheidet Architektur, testet per Sprache/Screenshot, gibt visuelles Feedback.

## Ablauf pro Session

1. Sojus baut einen Block Features (20-40 Min autonom)
2. Jonas bekommt kompakte Testliste (nummeriert, ~5 Min Testzeit)
3. Jonas testet, meldet Ergebnis (funktioniert / funktioniert nicht / sieht komisch aus + Screenshot)
4. Jonas guckt Anime, Sojus baut nächsten Block
5. Repeat

## Benachrichtigungen (WICHTIG)

- **Sobald Sojus mit einem Block fertig ist → SOFORT eine Push-Benachrichtigung
  an Jonas senden.**
- **Weg: Cloud-Push (Claude-Code-eigene `PushNotification`), NICHT Home Assistant.**
  (HA nur, wenn ausdrücklich gewünscht / der HA-MCP in der Session verbunden ist.)
- Kurz, eine Zeile, das Wichtigste zuerst (was fertig, wo testen).

## Testlisten-Format

```
Teste jetzt (X Min):
1. [Aktion] → [erwartetes Ergebnis]?
2. [Aktion] → [erwartetes Ergebnis]?
...
Wenn was komisch aussieht: Screenshot.
```

- Kein Prosa, keine Erklärungen
- Mehrere Tests gebündelt
- Konkrete Buttons/Menüs benennen

## Modell-Einsatz

- **Opus:** Architektur, Fundament, komplexe Features (Plugin-System, Avatar-Engine)
- **Sonnet:** Masse der UI-Features, Adapter, Pattern-Arbeit
- **Effort high:** Standard. Max nur für Fundament-Architektur.

## Feature-Tracking

Feature-Liste: `feature-picker-v2.html` (Artifact + lokal)
Aktuelle Entscheidungen werden per JSON-Export gesichert.

## Tech-Stack

- TypeScript + reaktives Web-Framework (Svelte/Solid/React — noch offen)
- Tauri (Desktop-Shell)
- Capacitor (Mobile-Shell, Android-Launcher)
- Plugin-System als JS-Module (Obsidian-kompatibel)

## Zeitrahmen

~6-10 Wochen bei regelmäßigem Arbeiten (4h/Abend Jonas, Rest autonom Sojus)
