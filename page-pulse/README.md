# Page Pulse

Page Pulse is a full-stack URL audit service. Users submit a URL and receive an instant
report covering performance, SEO fundamentals, link health, and security headers.

![CI](https://img.shields.io/badge/CI-GitHub_Actions-blue)
![Node](https://img.shields.io/badge/Node-20.x-green)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

## Overview

- **Backend**: Node.js + Express + TypeScript API that fetches a target page, parses it with
  Cheerio, and returns structured audit metrics. Results are cached in Redis (with an
  in-memory fallback) and outbound fetches are rate-limited and concurrency-capped.
- **Frontend**: React + TypeScript + TailwindCSS single-page app with dark mode, accessible
  components, loading skeletons, and animated results powered by Framer Motion.
- **Ops**: Dockerized services, docker-compose for local orchestration, and a GitHub Actions
  pipeline that installs, lints, tests, and builds both apps on every push.

## Architecture

```
                     ┌────────────────┐        ┌──────────────┐
   Browser  ───────▶ │  React Frontend │──────▶ │  Express API │
  (Vite/React)        └────────────────┘  HTTP  └──────┬───────┘
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                                    │                      │                     │
                             Concurrency Queue      Redis Cache            Target Website
                             (bounded fetches)    (TTL-based, w/          (audited via
                                                    in-memory fallback)     axios + cheerio)
```

See [architecture.md](./architecture.md) for the full system design, data flow, caching and
queue strategy, scaling plan, and failure-mode analysis.

## Features

- URL validation that rejects empty values, malformed URLs, non-http(s) protocols,
  `localhost`, and private/internal IP ranges (SSRF protection)
- Full page audit: HTTP status, response time, HTTPS check, title, meta description,
  word count, image count, broken image detection, internal/external link counts, page
  size, content type, and security headers
- Redis-backed response caching with configurable TTL and a `cached` flag in the response,
  degrading gracefully to an in-memory cache if Redis is unreachable
- Bounded concurrency for outbound fetches via a semaphore-based queue
- Hard 5-second fetch timeout, surfaced as `408 Request Timeout`
- IP-based rate limiting (100 requests/hour by default) returning `429 Too Many Requests`
- Structured Pino logging with request ID, timestamp, duration, IP, route, and status on
  every request
- Consistent, stack-trace-free JSON error responses
- Responsive, accessible, dark-mode-capable frontend with keyboard navigation support

## Tech Stack

**Backend:** Node.js, Express, TypeScript, Axios, Cheerio, UUID/crypto.randomUUID,
express-rate-limit, Pino, Redis (ioredis), Jest, Supertest, nock

**Frontend:** React, TypeScript, TailwindCSS, Axios, React Router, TanStack Query,
Framer Motion, lucide-react

**Deployment:** Backend → Render, Frontend → Vercel, CI → GitHub Actions, Docker +
docker-compose for local/self-hosted orchestration

## Project Structure

```
page-pulse/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Audit, fetch, and queue business logic
│   │   ├── middleware/      # Logging, error handling, rate limiting
│   │   ├── routes/          # Express routers
│   │   ├── validators/      # Input validation (URL / SSRF checks)
│   │   ├── cache/           # Redis + in-memory cache abstraction
│   │   ├── utils/           # Logger, typed error classes
│   │   ├── types/           # Shared TypeScript interfaces
│   │   ├── app.ts           # Express app factory
│   │   └── server.ts        # Process entrypoint
│   ├── tests/                # Jest + Supertest test suites
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Navbar, Footer, AuditForm, ResultCard, etc.
│   │   ├── pages/            # Home, Results, About, NotFound
│   │   ├── hooks/            # useAudit (TanStack Query mutation)
│   │   ├── services/         # Axios API client
│   │   ├── types/            # Shared frontend types
│   │   └── styles/           # Tailwind entrypoint
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/test.yml
├── docker-compose.yml
├── architecture.md
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+ (20 recommended)
- npm 9+
- Redis (optional — the API falls back to an in-memory cache automatically if Redis isn't
  running, so it's fine to skip this for local development)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # starts the API on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # starts the app on http://localhost:5173
```

### Docker (both services + Redis)

```bash
docker compose up --build
```

This starts Redis, the backend on `:4000`, and the frontend on `:5173`.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API port |
| `NODE_ENV` | `development` | Environment name |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for CORS |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `CACHE_TTL` | `600` | Cache TTL in seconds |
| `MAX_CONCURRENT_FETCHES` | `5` | Max simultaneous outbound audits |
| `FETCH_TIMEOUT_MS` | `5000` | Timeout before returning `408` |
| `RATE_LIMIT_WINDOW_MS` | `3600000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `LOG_LEVEL` | `info` | Pino log level |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000` | Backend API base URL |

No secrets are committed to the repository; `.env` files are gitignored and `.env.example`
files document the required variables.

## API Documentation

### `POST /api/audit`

Runs (or returns a cached copy of) an audit for the given URL.

**Request**

```json
{ "url": "https://example.com" }
```

**Success response — `200 OK`**

```json
{
  "success": true,
  "requestId": "b1946ac9-2b5f-4a3f-9b2e-1a2b3c4d5e6f",
  "cached": false,
  "data": {
    "url": "https://example.com/",
    "statusCode": 200,
    "responseTimeMs": 182,
    "httpsEnabled": true,
    "title": "Example Domain",
    "metaDescription": "An example page for testing.",
    "wordCount": 28,
    "totalImages": 2,
    "brokenImages": 0,
    "internalLinks": 4,
    "externalLinks": 1,
    "pageSizeBytes": 1256,
    "contentType": "text/html; charset=UTF-8",
    "securityHeaders": {
      "strictTransportSecurity": "max-age=63072000",
      "contentSecurityPolicy": null,
      "xFrameOptions": "DENY",
      "xContentTypeOptions": "nosniff",
      "referrerPolicy": "no-referrer",
      "permissionsPolicy": null
    },
    "auditedAt": "2026-07-25T05:00:00.000Z"
  }
}
```

**Error response shape** (used for all error statuses)

```json
{
  "success": false,
  "requestId": "b1946ac9-2b5f-4a3f-9b2e-1a2b3c4d5e6f",
  "error": { "code": "INVALID_URL", "message": "URL is required and must be a non-empty string." }
}
```

| Status | Code | Trigger |
|---|---|---|
| 400 | `INVALID_URL` | Missing, empty, malformed, or non-http(s) URL |
| 400 | `PRIVATE_ADDRESS_BLOCKED` | `localhost`, private IP range, or `.local`/`.internal` host |
| 408 | `REQUEST_TIMEOUT` | Target site did not respond within `FETCH_TIMEOUT_MS` |
| 429 | `RATE_LIMIT_EXCEEDED` | Caller exceeded the per-IP rate limit |
| 502 | `FETCH_FAILED` | Network error reaching the target site |
| 500 | `INTERNAL_ERROR` | Unexpected server error (never includes a stack trace) |

Both `/api/audit` and the versioned `/api/v1/audit` alias are available.

### `GET /health`

Returns service status, uptime, Redis connectivity, and current queue depth — suitable for
container health checks and uptime monitors.

## Testing

```bash
cd backend
npm test            # Jest + Supertest, with coverage report
```

Covers: invalid URL, private-address rejection, successful audit and response shape,
caching behavior (`cached: true` on repeat requests), timeout handling (`408`), unreachable
targets (`502`), and the health endpoint. Outbound HTTP is mocked with `nock`, so the suite
runs hermetically with no real network access.

## Deployment

- **Backend → Render**: create a Web Service pointing at `backend/`, build command
  `npm ci && npm run build`, start command `npm start`, and configure the environment
  variables listed above (add a managed Redis instance and set `REDIS_URL`).
- **Frontend → Vercel**: import the repo, set the root directory to `frontend/`, framework
  preset "Vite", and set `VITE_API_BASE_URL` to the deployed backend URL.
- **CI**: `.github/workflows/test.yml` runs on every push/PR, installing, linting, testing,
  and building both apps; the workflow fails on any error.

## Future Improvements

- Persist audit history per user/session and expose a `GET /api/audit/history` endpoint
- Swagger/OpenAPI spec and a Postman collection for the API
- Lighthouse-style performance scoring in addition to the current metrics
- WebSocket or SSE streaming of audit progress for slower pages
- Multi-region deployment with a CDN-backed cache layer

## Screenshots

_Add screenshots of the Home and Results pages here once deployed._

## License

MIT
