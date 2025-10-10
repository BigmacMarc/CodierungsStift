Contributing Guide

Branching
- main: stabil, releasereif
- feat/<thema>: Feature-Branches für Entwicklung

Pull Requests
- Kleinteilige, fokussierte Änderungen
- PR-Template nutzen: Checkliste vollständig ausfüllen
- CI muss grün (Lint, Typecheck, Build, Tests)

Code Style
- TypeScript, React
- ESLint + Prettier: `npm run lint` / `npm run format`
- Keine unnötigen Abhängigkeiten

Commit Messages
- Konvention: pragmatisch, aber aussagekräftig (z. B. "feat: add zip import/export")

Testing
- Vitest für Unit, Playwright für E2E Smoke
- Tests lokal ausführen vor dem Push

Review
- Mindestens 1 Review (optional CODEOWNERS)

