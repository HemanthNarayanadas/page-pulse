# Page Pulse — Architecture

## 1. System Architecture

Page Pulse is a two-tier application: a stateless React SPA and a stateless Express API,
backed by a Redis cache. The API never persists audit data beyond the cache TTL — every
request either serves a cached result or performs a live audit.

```
┌──────────────┐      HTTPS       ┌───────────────────┐
│   Browser    │ ───────────────▶ │   React Frontend    │
│ (end user)   │ ◀─────────────── │   (Vercel / static)  │
└──────────────┘                  └─────────┬───────────┘
                                             │ REST (JSON)
                                             ▼
                                   ┌───────────────────┐
                                   │   Express API       │
                                   │   (Render)           │
                                   │  ┌───────────────┐  │
                                   │  │ Rate Limiter   │  │
                                   │  ├───────────────┤  │
                                   │  │ URL Validator  │  │
                                   │  ├───────────────┤  │
                                   │  │ Cache Lookup   │──┼──────▶ ┌─────────────┐
                                   │  ├───────────────┤  │        │    Redis     │
                                   │  │ Concurrency    │  │ ◀──────┤  (or memory  │
                                   │  │ Queue          │  │        │   fallback)  │
                                   │  ├───────────────┤  │        └─────────────┘
                                   │  │ Fetch + Parse  │──┼──────▶ Target Website
                                   │  │ (axios+cheerio)│  │        (audited)
                                   │  └───────────────┘  │
                                   └───────────────────┘
```

## 2. Component Diagram

| Component | Responsibility |
|---|---|
| `validators/urlValidator` | Rejects malformed, non-http(s), and private/internal-address URLs before any network call is made (SSRF prevention) |
| `middleware/rateLimiter` | Per-IP request throttling using `express-rate-limit` |
| `cache/cacheService` | Cache-aside abstraction over Redis with an in-memory fallback; single interface (`get`/`set`) hides the backing store from callers |
| `services/queueService` | Counting semaphore bounding concurrent outbound fetches |
| `services/fetchService` | Performs the outbound HTTP GET with a hard timeout, and HEAD checks for image liveness |
| `services/auditService` | Orchestrates cache lookup → fetch → Cheerio parsing → cache write; the core business logic |
| `controllers/*` | Thin HTTP adapters that translate requests into service calls and responses |
| `middleware/errorHandler` | Maps typed `AppError` subclasses to HTTP status codes and a uniform JSON error shape; never leaks stack traces |
| `middleware/requestLogger` | Assigns a request ID and logs structured request/response metadata via Pino |

## 3. Data Flow

1. Client submits a URL to `POST /api/audit`.
2. `requestLogger` assigns a `requestId` and starts a duration timer.
3. `auditRateLimiter` checks the caller's IP against the rolling window; over-limit
   requests short-circuit with `429`.
4. `validateAuditUrl` parses the URL, rejects empty/malformed/non-http(s) values, and
   rejects hostnames resolving to loopback, private, link-local, or `.local`/`.internal`
   addresses.
5. `auditService.runAudit` builds a cache key from the normalized URL and checks
   `cacheService.get`.
   - **Cache hit**: the stored JSON is parsed and returned immediately with `cached: true`.
   - **Cache miss**: proceed to fetch.
6. `fetchService.fetchPage` acquires a slot from the concurrency queue, issues the GET
   with a `FETCH_TIMEOUT_MS` abort controller, and releases the slot in a `finally` block
   whether the fetch succeeds, times out, or errors.
7. The HTML is parsed with Cheerio to extract title, meta description, word count, image
   sources, and internal/external link counts (compared against the target's hostname).
8. Up to 15 image URLs are checked with lightweight HEAD requests to estimate broken-image
   count without materially increasing latency.
9. Response headers are inspected for the six tracked security headers.
10. The assembled `AuditResult` is written back to the cache with the configured TTL and
    returned to the client with `cached: false`.
11. `requestLogger`'s `finish` handler logs the final status and duration.

## 4. Caching Strategy

- **Pattern**: cache-aside. The service checks the cache before fetching and writes
  through after a successful audit; it never proactively invalidates or pre-warms.
- **Key**: `audit:<lowercased-normalized-url>` — case-insensitive so trivial casing
  differences don't fragment the cache.
- **TTL**: configurable via `CACHE_TTL` (default 600s), balancing freshness against load
  on target sites. Since audited pages can change between requests, a short TTL is
  preferred over long-lived caching.
- **Backing store**: Redis is the primary store because it is shared across horizontally
  scaled API instances — an in-process cache alone would give inconsistent `cached` flags
  depending on which instance served a given request.
- **Resilience**: every write is mirrored to an in-memory `Map` as well as Redis. If Redis
  is unreachable, reads and writes transparently fall back to the in-process map so the
  service keeps functioning (with per-instance rather than shared caching) instead of
  failing every request.

## 5. Queue / Concurrency Strategy

- A counting semaphore (`ConcurrencyQueue`) caps the number of simultaneous outbound
  fetches to `MAX_CONCURRENT_FETCHES` (default 5) **per API instance**.
- Requests beyond the limit queue in-process (a FIFO array of resolver callbacks) rather
  than being rejected, so a burst of audits is smoothed out instead of dropped.
- This protects the API process from exhausting its own outbound connection pool and
  keeps a single Node process from being overwhelmed by many parallel slow target sites.
- The `/health` endpoint exposes `activeFetches` and `queuedFetches` so operators can see
  queue pressure in real time.

## 6. Scaling Strategy

- **Stateless API**: because all state lives in Redis (cache) rather than in-process, the
  Express API can be scaled horizontally behind a load balancer (e.g. multiple Render
  instances) without sticky sessions.
- **Shared cache**: Redis being external (not per-instance) means cache hits are shared
  across all API replicas, multiplying the effective cache hit rate as instance count
  grows.
- **Per-instance concurrency limits**: `MAX_CONCURRENT_FETCHES` bounds outbound load per
  instance; total outbound concurrency scales linearly with replica count, which is the
  desired behavior for horizontal scaling.
- **Frontend**: a static SPA served from Vercel's CDN scales independently of the API and
  requires no backend compute.
- **Vertical headroom**: CPU-bound work (Cheerio parsing) is lightweight per request; the
  bottleneck under load is outbound network latency to target sites, which horizontal
  scaling addresses directly.

## 7. Technology Decisions & Alternatives Considered

| Decision | Why | Alternatives considered |
|---|---|---|
| Express over Fastify/Koa | Mature ecosystem, team familiarity, simplest fit for a moderate-traffic REST API | Fastify (faster, but the bottleneck here is outbound HTTP, not framework overhead) |
| Cheerio over a headless browser (Puppeteer) | Audits are static-HTML metrics; Cheerio is far lighter-weight and faster than launching a browser per request | Puppeteer/Playwright (necessary only if JS-rendered content must be audited — noted as a future improvement) |
| Redis with in-memory fallback over Redis-only | Keeps the service available in dev/CI and during Redis outages, at the cost of temporarily non-shared cache state | Fail closed (reject all requests without Redis) — rejected as too brittle |
| In-process semaphore over a distributed queue (e.g. BullMQ) | Concurrency limiting is per-instance and short-lived (seconds), not a durable job queue; a full job queue adds operational overhead disproportionate to the need | BullMQ/Redis-backed queue — reconsider if audits become async/long-running |
| express-rate-limit (in-memory) over a Redis-backed limiter | Simple, zero extra infra for a single-region deployment | `rate-limit-redis` store — recommended if scaling to multiple regions/instances, since in-memory limits are per-instance |

## 8. Failure Modes & Mitigations

| Failure | Impact | Mitigation |
|---|---|---|
| **Website timeout** | The audited site is slow or unresponsive | Hard `FETCH_TIMEOUT_MS` (default 5s) via `AbortController`; returns `408` immediately rather than hanging the request |
| **Traffic spike** | Sudden surge of audit requests | Per-IP rate limiting (`429` beyond threshold) plus the concurrency queue smooths outbound load; horizontal scaling absorbs sustained increases |
| **Redis unavailable** | Cache backend down | Automatic in-memory fallback keeps the API serving requests; `/health` reports `redisConnected: false` so operators are alerted |
| **Server crash** | Process exits unexpectedly | Container orchestrator (Render/Docker) restarts the process automatically; graceful shutdown handlers (`SIGTERM`/`SIGINT`) drain in-flight requests before exit |
| **Memory leak** | Gradual resource exhaustion | Bounded in-memory cache fallback (TTL-expired entries), bounded concurrency queue, and container memory limits with restart-on-OOM as a backstop; monitor RSS over time (see Observability) |
| **Rate limit abuse** | A single client hammering the API | `express-rate-limit` enforces a hard per-IP ceiling; requests beyond it are rejected before any outbound fetch is attempted, so abuse never reaches the audit logic |
| **Malicious target URL (SSRF)** | Attempt to audit internal/private infrastructure | `urlValidator` rejects localhost, private IPv4/IPv6 ranges, and `.local`/`.internal` hosts before any request is made |
| **Oversized/malicious response body** | Target site returns huge or malformed HTML | `express.json({ limit: '100kb' })` caps request body size; Cheerio parsing is resilient to malformed HTML by design; response streaming could be added if very large pages become an issue |

## 9. Observability

**Metrics to monitor in production:**

- **CPU** — per-instance utilization; sustained high CPU suggests parsing load or too few
  replicas
- **Memory** — RSS over time; a steady upward trend indicates a leak (see failure modes)
- **Latency** — p50/p95/p99 of `POST /api/audit`, split by cache hit vs. miss
- **Cache hit rate** — `cached: true` responses ÷ total responses; a sudden drop can
  indicate Redis connectivity issues
- **Error rate** — proportion of `4xx`/`5xx` responses, broken down by error `code`
- **Queue length** — `queuedFetches` from `/health`; sustained non-zero values indicate
  the concurrency limit is under-provisioned for current load

**Health endpoint**: `GET /health` returns `status`, `uptimeSeconds`, `redisConnected`,
`activeFetches`, and `queuedFetches` — suitable for both container health checks and
external uptime monitors.

**Structured logs**: every request is logged (via Pino) with `requestId`, `timestamp`,
`durationMs`, `ip`, `route`, `method`, and `status`, making it straightforward to ship
logs to a platform like Datadog, Grafana Loki, or CloudWatch and build dashboards/alerts
directly from them.

## 10. Alerting

Recommended alert thresholds (to be wired into whatever monitoring platform is deployed):

- Error rate (5xx) > 5% over a 5-minute window
- p95 latency > 4.5s (approaching the 5s fetch timeout, suggesting queueing pressure)
- `redisConnected: false` for more than 2 consecutive health checks
- `queuedFetches` > 20 sustained for more than 1 minute (concurrency limit undersized)
- Memory RSS growth > 20% over 1 hour with no corresponding traffic increase (possible leak)

## 11. Rollback Strategy

- Both services are deployed independently (Render for the API, Vercel for the frontend),
  and both platforms retain prior deployments — a rollback is a one-click revert to the
  last known-good deployment on either platform.
- The GitHub Actions pipeline blocks merges/deploys on any lint, test, or build failure,
  so a broken build should never reach production in the first place.
- Because the API is stateless (all persisted state lives in Redis as a pure cache), a
  rollback of the API version requires no data migration — the previous version can read
  and write the same cache key format safely as long as the `AuditResult` shape is
  backward compatible. If a future release changes the cached response shape, bump the
  cache key prefix (e.g. `audit:v2:`) to avoid serving mismatched cached shapes to an
  older or newer version during the rollout window.
