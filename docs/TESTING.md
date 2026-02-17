# Teststrategie

## Übersicht

- **Unit-Tests:** Jest + NestJS `TestingModule`, Mocks für DB/APIs.
- **Integrationstests:** Echte DB, nur wenn `DATABASE_URL` gesetzt ist (sonst `it.skip`).
- **E2E:** Zwei Suiten – eine **ohne** DB (In-Memory-Mock), eine **mit** echter DB (optional).

## Befehle

| Befehl | Beschreibung |
|--------|---------------|
| `npm test` | Unit- + Integrationstests (alle `*.spec.ts` unter `src/`). |
| `npm run test:watch` | Jest im Watch-Modus. |
| `npm run test:cov` | Tests mit Coverage-Report (`coverage/`). |
| `npm run test:e2e` | E2E-Tests unter `test/*.e2e-spec.ts`. |

## Unit-Tests

- **Ort:** Neben dem Code, z.B. `leads.controller.spec.ts`, `ai.service.spec.ts`, `prisma.service.spec.ts`, Guards/Pipes.
- **Lauf:** `npm test` (Jest mit `rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"`).
- Abhängigkeiten werden gemockt; keine echte DB nötig.

## Integrationstests

- **Beispiel:** `src/prisma/prisma.service.integration.spec.ts`.
- Prisma mit echter Datenbank (Verbindung, einfache Queries, Tabellen-Check).
- Werden **übersprungen**, wenn `DATABASE_URL` fehlt (`it.skip`).

## E2E-Tests

- **Konfiguration:** `test/jest-e2e.json`, Pattern `*.e2e-spec.ts`.

### App-E2E (`test/app.e2e-spec.ts`)

- Vollständige App, **Prisma durch In-Memory-Mock** ersetzt.
- Rate-Limiting in Tests deaktiviert (AllowAllGuard).
- HTTP-Requests mit Supertest (POST/GET Leads, Validierung, Fehlerfälle).
- **Läuft ohne Datenbank** – geeignet für CI und schnelle Prüfung.

### Leads-E2E mit DB (`test/leads.e2e-spec.ts`)

- Echte App, **echte Datenbank**.
- Vor jedem Test: `prisma.lead.deleteMany()`.
- Wird **übersprungen**, wenn `DATABASE_URL` fehlt.
- Prüft z.B. „POST Lead → GET leads liefert den angelegten Lead“.

## Coverage

- `collectCoverageFrom`: `**/*.(t|j)s` unter `src/`.
- Report: `coverage/` (nach `npm run test:cov`).
