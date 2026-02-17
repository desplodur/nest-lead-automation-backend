# Architektur

## Zweck der Anwendung

Dieses Programm ist ein **Backend-Dienst für die Lead-Automatisierung** im Vertrieb:

- **Lead-Erfassung:** Über die API können neue Leads (Firma/Ansprechpartner, E-Mail, Nachricht) eingereicht werden. Sie werden validiert, gegen XSS bereinigt und in einer PostgreSQL-Datenbank persistiert.
- **Lead-Liste:** Alle gespeicherten Leads können abgerufen werden (neueste zuerst), inklusive optionaler KI-Felder (Score, Analyse, generierter E-Mail-Text).
- **Optionale KI-Auswertung:** Ist ein Groq-API-Key konfiguriert, wird jeder neue Lead per KI analysiert. Das Backend speichert einen Qualitäts-Score, eine kurze Einordnung und einen vorgeschlagenen Antwort-E-Mail-Text am Lead. So können Vertriebsteams Leads priorisieren und schneller reagieren.
- **Betrieb:** Health-Endpoint für Liveness-Checks (z. B. Container/Orchestrierung), Rate-Limiting, CORS und Swagger-Dokumentation unter `/api/docs`.

Ohne Groq-Key bleibt die Erfassung und Auflistung voll funktionsfähig; nur die KI-Schritte entfallen.

## Übersicht (Technik)

Das Backend ist eine **NestJS**-Anwendung für Lead-Erfassung mit optionaler **AI-Qualifizierung** (Groq) und E-Mail-Vorschlägen. Es nutzt **Prisma** mit **PostgreSQL** und bietet eine REST-API mit **Swagger/OpenAPI**.

## Module

| Modul | Zweck |
|-------|--------|
| **AppModule** | Wurzel: Config, Throttler, globale Guards und Middleware. |
| **PrismaModule** | Datenbankzugriff (PostgreSQL via Prisma). |
| **LeadsModule** | Lead-Erstellung und -Auflistung (Controller + Service). |
| **AIModule** | Groq-Anbindung: Lead-Analyse (Score, Kategorien) und E-Mail-Generierung. |
| **HealthModule** | Liveness-Endpoint für Monitoring/Container. |

## Ablauf Lead-Erstellung

1. **POST /leads** – Request wird validiert (DTO), sanitized (XSS), in DB gespeichert.
2. Optional: **AiService** analysiert den Lead (Groq), setzt `score`, `analysis`, `generatedEmail` und aktualisiert den Lead in der DB.
3. Response enthält `leadId`, `createdAt` und bei Erfolg die AI-Felder.

## Gemeinsame Bausteine

- **Guards:** `CustomThrottlerGuard` – globales Rate-Limiting (konfigurierbar), POST /leads mit strengerem AI-Limit.
- **Pipes:** `SanitizePipe` (global) – XSS-Sanitization; `ValidationPipe` – DTO-Validierung.
- **Middleware:** Request-ID (Trace), Request-Logger.

## Technologie-Stack

- **Runtime:** Node.js  
- **Framework:** NestJS 11  
- **ORM:** Prisma 6, PostgreSQL  
- **API-Dokumentation:** Swagger/OpenAPI (`@nestjs/swagger`)  
- **AI:** Groq API (optional)  
- **Sicherheit:** Helmet, CORS, Rate-Limiting, Sanitization  
