Local CodePen IDE (Offline Web IDE)

Beschreibung
- Single-Page-App lokal (ohne Cloud) mit drei Editoren (HTML/CSS/JS) oben und Live-Vorschau unten. Mehrdatei-Support, Tabs, Dateibaum, Monaco Editor, Live-Reload und integrierte Konsole/Fehler-Overlay. ZIP Import/Export für Projekte. Hell/Dunkel Theme, Split-Panel mit Persistenz.

Setup
- Voraussetzungen: Node.js >= 18.17
- Installation: `npm install`
- Start Dev: `npm run dev` (öffnet auf http://localhost:5173)
- Build: `npm run build` → Produktionsbuild unter `dist/`
- Preview (nach Build): `npm run preview`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm run test` (Unit), `npm run test:e2e` (Playwright E2E)

Bedienung (MVP)
- Oben: Dateibaum links, Tabs und Editor rechts (Monaco). Unten: Vorschau (iframe Sandbox) mit Konsole.
- Resizable: Horizontaler Splitter zwischen Editoren und Vorschau, Position wird gespeichert.
- Live-Reload: Änderungen aktualisieren nach kurzer Pause die Vorschau automatisch.
- Tastatur-Shortcuts:
  - Neu laden: Ctrl/Cmd + Enter
  - Formatieren: Ctrl/Cmd + Shift + F
  - Vorschau ein-/ausklappen: Ctrl/Cmd + Alt + P
- ZIP Export/Import: Alle Dateien am Projekt-Root. HTML/CSS/JS anhand der Endung erkannt, `index.html` wird als Entry markiert.
- Theme: Umschalten Hell/Dunkel über Toolbar, wird gespeichert.

Sicherheit
- Vorschau läuft in `iframe` mit `sandbox="allow-scripts"` und strenger Content-Security-Policy (kein Netzwerk, kein Fremdzugriff).
- Kein `eval` außerhalb der Sandbox. Logging erfolgt via `postMessage` aus der Sandbox.

Architektur
- Frontend: Vite + React + TypeScript, Monaco Editor (ESM, Workers via Vite bundling), keine externe Services.
- Styling: CSS Variablen, minimalistische Komponenten.
- State: React State, LocalStorage Persistenz.
- Tests: Vitest (Unit), Playwright (E2E Smoke).

Repo-Struktur
```
/app (Quellcode)
  /lib (Utility/State)
  /ui (Komponenten)
/public (optional, derzeit leer)
README.md
CONTRIBUTING.md
.editorconfig
.gitignore
package.json
vite.config.ts
```

Team-Workflow
- Branches: `main` (stabil), `feat/<thema>` für Entwicklung.
- PRs: Nutze `.github/PULL_REQUEST_TEMPLATE.md` Checkliste, CI muss grün sein (Lint, Typecheck, Build, Unit-Tests, E2E-Smoke).
- Code-Style: ESLint + Prettier; husky/pre-commit optional (nicht konfiguriert).

Troubleshooting
- Portkonflikt 5173: `vite.config.ts` anpassen oder `npm run dev -- --port 5174`.
- CSP: Vorschau setzt strikte CSP. Falls externe Ressourcen benötigt werden, lokal einbinden (Assets) oder CSP im generierten HTML gezielt anpassen.
- CORS: Nicht relevant – alle Ressourcen werden inline oder lokal geladen.
- Monaco-Worker: Falls Editor nicht lädt, sicherstellen, dass Browser `Worker` unterstützt und Bundler die `?worker`-Imports auflöst (Vite Standard).

Akzeptanzkriterien Mapping
- Drei Editoren (Tabs/Mehrdatei) + Live-Vorschau unten, Größe via Splitter frei verstellbar, Persistenz via LocalStorage.
- Live-Reload für alle Dateien (HTML/CSS/JS); Entry-HTML ist wählbar.
- Fehler-Overlay und Konsole für `console.*` und `error`/`unhandledrejection` Ereignisse.
- ZIP Import/Export – clientseitig via JSZip.
- Lokaler Start: `npm install` → `npm run dev`; Build: `npm run build`.
- CI: `.github/workflows/ci.yml` führt Lint, Typecheck, Build und Tests aus.

Roadmap / Bonus
- Templates-Galerie (mehr Vorlagen), PWA/Service Worker, Asset-Panel, Einstellungsdialog (Auto-Save-Delay), Sharing-Link per Base64/URL.

