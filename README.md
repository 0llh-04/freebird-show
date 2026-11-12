# 🦅 Freebird Gameshow

Desktop-App (Electron) zur Unterstützung der **Freebird Gameshow**: Punkte (🦅) zählen,
Joker/Hinweise protokollieren, animiertes Leaderboard, Tiebreaker-Runde und Podium mit Konfetti.

## Features

- **Setup**: Teams mit Namen und je zwei Spielern erstellen, Anzahl der Runden festlegen (jedes Team startet mit 6 Jokern).
- **Spielphase**: „Team X ist am Zug“-Einblendung, Joker-Einsatz mit optionalem Notizfeld wird protokolliert, Punkte (auch negative Korrekturen) mit Sofort-Buttons (+1/+5/+10) oder freier Eingabe vergeben, letzte Aktion kann zurückgenommen werden.
- **Auflösungsphase**: Leaderboard mit hochzählendem Gesamtpunktestand (Animation), animiertem Platzwechsel (FLIP) und Balkenanzeige.
- **Rundenwechsel**: Jede neue Runde startet mit einer anderen (rotierten) Teamreihenfolge.
- **Tiebreaker**: Bei Punktegleichstand nach der letzten Runde treten die betroffenen Teams head-to-head gegeneinander an – eine reine entweder-oder-Entscheidung ohne Punkte und ohne Joker, die nur die Platzierung im Leaderboard bestimmt.
- **Podium**: Siegerteam wird gekürt, Teamnamen blenden langsam ein, Konfetti in den Show-Farben, finaler Punktestand aller Teams.
- **Autosave**: Der Show-Zustand wird lokal gespeichert; nach einem Neustart kann fortgesetzt werden.
- **Design**: dunkler Hintergrund mit Verlauf von Lila über Blau nach Grün.

## Voraussetzungen (Apple Silicon / ARM-Mac)

1. [Node.js LTS](https://nodejs.org/) installieren (arm64-Build).
2. Im Projektordner:

```bash
npm install
npm start
```

`npm install` lädt automatisch die native Electron-Version für `darwin-arm64` herunter –
keine weiteren Schritte nötig.

## Als App verpacken (optional)

```bash
npx electron-builder --mac --arm64
```

Erzeugt eine `.app`/`.dmg` für Apple Silicon (Ausgabe in `dist/`).

## Tests

Die Spiellogik (Reihenfolge, Standings, Tiebreaker-Regeln) ist von der GUI getrennt und
mit Node getestet:

```bash
npm test
```

## Ablauf einer Show

1. Teams erstellen (Name + 2 Spieler) → Rundenanzahl wählen → „Show starten“.
2. Pro Team: Joker einsetzen (wird protokolliert) und Punkte sammeln → „Nächstes Team“.
3. Nach dem letzten Team: Auflösung mit animiertem Leaderboard.
4. Nächste Runde starten (neue Reihenfolge) – bis zur letzten Runde.
5. Bei Gleichstand: Tiebreaker head-to-head – per Klick entscheiden, welches Team gewinnt (keine Punkte, keine Joker).
6. Podium: Sieger wird gekürt, Konfetti 🎉, finaler Punktestand.
