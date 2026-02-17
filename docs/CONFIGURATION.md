# Konfiguration

Alle Einstellungen erfolgen über **Umgebungsvariablen**. Lokal: `.env` (siehe `.env.example`).

## Variablen

| Variable | Pflicht | Beschreibung |
|----------|--------|--------------|
| **DATABASE_URL** | Ja | PostgreSQL-Connection-String. Docker: `postgresql://postgres:postgres@postgres:5432/leads` |
| **GROQ_API_KEY** | Nein | API-Key für Groq. Ohne Key: Leads werden gespeichert, AI-Analyse/E-Mail werden übersprungen. |
| **NODE_ENV** | Nein | `development` \| `production`. Default: `development`. |
| **PORT** | Nein | HTTP-Port. Default: `3000`. |
| **CORS_ENABLED** | Nein | `true` \| `false`. Default: `true`. |
| **ALLOWED_ORIGINS** | Nein | Kommagetrennte CORS-Origins. Z.B. `http://localhost:3000,https://app.example.com`. |
| **RATE_LIMIT_TTL** | Nein | TTL für allgemeines Rate-Limit (ms). Default: `900000` (15 min). |
| **RATE_LIMIT_MAX** | Nein | Max. Requests pro TTL (global). Default: `100`. |
| **AI_RATE_LIMIT_TTL** | Nein | TTL für POST /leads (AI) (ms). Default: `60000` (1 min). |
| **AI_RATE_LIMIT_MAX** | Nein | Max. POST /leads pro AI-TTL. Default: `20`. |

## Beispiel .env

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
GROQ_API_KEY=your_groq_api_key_here
NODE_ENV=development
PORT=3000
CORS_ENABLED=true
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_TTL=900000
RATE_LIMIT_MAX=100
AI_RATE_LIMIT_TTL=60000
AI_RATE_LIMIT_MAX=20
```

## Production

- Starke DB-Passwörter und sichere `DATABASE_URL`.
- `NODE_ENV=production`.
- `ALLOWED_ORIGINS` auf echte Frontend-Origins setzen.
- Rate-Limits je nach Last anpassen.
