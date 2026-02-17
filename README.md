# Lead Automation Backend

NestJS-Backend für Lead-Erfassung mit optionaler **AI-Qualifizierung** (Groq) und E-Mail-Vorschlägen. REST-API mit **Swagger**, PostgreSQL (Prisma), Rate-Limiting und CORS.

## Was macht das Programm?

Die Anwendung ist ein **Backend für Sales-Leads**: Ein Frontend oder externe Systeme können über die REST-API neue Leads übermitteln (Name, E-Mail, Nachricht). Jeder Lead wird in einer **PostgreSQL**-Datenbank gespeichert und kann über eine weitere API-Abfrage gelistet werden.

Optional wird jeder neue Lead per **Groq (KI)** analysiert: Es werden ein Qualitäts-Score, eine kurze Einordnung und ein vorgeschlagener E-Mail-Text erzeugt und am Lead gespeichert. So können Vertriebsteams priorisieren und schneller antworten. Ohne konfigurierten Groq-API-Key funktioniert die Erfassung und Auflistung weiterhin; die KI-Schritte werden dann übersprungen.

Zusätzlich bietet die Anwendung einen Health-Check für Monitoring, Rate-Limits zum Schutz vor Überlastung sowie CORS- und Sicherheits-Einstellungen (Helmet, Sanitization). Die API ist über **Swagger** unter `/api/docs` vollständig dokumentiert.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Dokumentation

| Thema | Datei |
|-------|--------|
| **Architektur** (Module, Abläufe) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Konfiguration** (Env-Variablen) | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) |
| **Tests** (Unit, E2E, Integration) | [docs/TESTING.md](docs/TESTING.md) |
| **API & Swagger** | [docs/API.md](docs/API.md) |

## Swagger (API-Dokumentation)

Die API ist mit **Swagger UI** vollständig dokumentiert (Endpoints, Schemas, Beispiele, „Try it out“).

- **Lokal:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Production:** `https://<deine-domain>/api/docs`

App starten, dann die URL im Browser öffnen – keine Anmeldung nötig. Details siehe [docs/API.md](docs/API.md).

## Projekt-Setup

```bash
npm install
```

Kopie von `.env.example` nach `.env` anlegen und mindestens `DATABASE_URL` setzen (optional `GROQ_API_KEY` für AI).

## Starten

```bash
# Entwicklung
npm run start

# Watch-Modus
npm run start:dev

# Production
npm run start:prod
```

## Tests

```bash
# Unit- und Integrationstests
npm run test

# E2E-Tests
npm run test:e2e

# Coverage
npm run test:cov
```

Siehe [docs/TESTING.md](docs/TESTING.md) für die Teststrategie.

## Docker

**Voraussetzung:** Docker und Docker Compose.

```bash
# App + PostgreSQL starten
docker-compose up -d

# Migrationen ausführen
docker-compose exec app npx prisma migrate deploy

# Logs
docker-compose logs -f app

# Stoppen
docker-compose down
```

Für Docker setzt `docker-compose` `DATABASE_URL` auf `postgresql://postgres:postgres@postgres:5432/leads`. Weitere Env-Variablen in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

**Prüfen:** `curl http://localhost:3000/health` und [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (Swagger). Die App läuft als Non-Root-User mit Health-Check.

**Production:** Starke Passwörter, `NODE_ENV=production`, `ALLOWED_ORIGINS` und Rate-Limits anpassen.

## Deployment

[NestJS Deployment](https://docs.nestjs.com/deployment). Option: [NestJS Mau](https://mau.nestjs.com) für AWS.

## Lizenz

MIT.
