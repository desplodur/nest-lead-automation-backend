# API-Dokumentation

## Swagger (OpenAPI)

Die API wird mit **Swagger UI** dokumentiert. Dort sind alle Endpoints, Request-/Response-Schemas und Beispiele beschrieben; „Try it out“ ist aktiviert.

- **URL (lokal):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Production:** `https://<deine-domain>/api/docs`

Nach dem Start der App im Browser öffnen – keine Anmeldung erforderlich.

### Inhalt in Swagger

- **Lead Automation API** – Titel der App.
- **Tags:** `leads`, `health`.
- **Server:** Development (localhost:3000), Production (Beispiel-URL).
- DTOs mit `@ApiProperty` sind als Schemas sichtbar; Request-Beispiele (z.B. High-/Low-Quality Lead) sind hinterlegt.

---

## Endpoints (Kurzüberblick)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| **GET** | `/health` | Liveness-Check. Response: `{ status: "ok", timestamp: "…" }`. |
| **POST** | `/leads` | Neuen Lead anlegen (name, email, message). 201 + Lead-Daten inkl. optional AI-Felder. Rate-Limit: AI-Limit (z.B. 20/60s). |
| **GET** | `/leads` | Alle Leads abrufen (neueste zuerst), inkl. optional score, analysis, generatedEmail. |

### POST /leads – Request-Body

```json
{
  "name": "string",
  "email": "string",
  "message": "string"
}
```

- Alle Felder erforderlich, E-Mail-Format wird validiert.
- Bei Erfolg: 201, Response enthält `success`, `data.leadId`, `data.createdAt` und bei AI: `data.score`, `data.analysis`, `data.generatedEmail`.

### Wichtige Statuscodes

- **201** – Lead erstellt.
- **200** – GET /leads OK.
- **400** – Validierungsfehler (z.B. ungültiges E-Mail-Format).
- **429** – Rate limit exceeded.
- **503** – Datenbank nicht erreichbar.

Details, weitere Codes und exakte Schemas siehe **Swagger unter `/api/docs`**.
