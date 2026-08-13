# Diagram-Ops — Functional Specification

### What the system does, who uses it, and how we'll know it works

> **Status:** design baseline for Phase 1. Every requirement below has an ID so that code, tests, and phase docs can reference it directly (e.g. a test named `FR-G4: retries once on syntax mismatch`).

**Companion documents**
- [project-overview.md](project-overview.md) — what the tools are and why
- [system-design.md](system-design.md) — ER diagram, UML diagrams, architecture
- [Phases/phase-1-application.md](Phases/phase-1-application.md) — the build instructions

---

## Contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Actors](#2-actors)
3. [Functional requirements](#3-functional-requirements)
4. [Non-functional requirements](#4-non-functional-requirements)
5. [Detailed use cases](#5-detailed-use-cases)
6. [API contract](#6-api-contract)
7. [Data validation rules](#7-data-validation-rules)
8. [Error catalogue](#8-error-catalogue)
9. [Out of scope](#9-out-of-scope)

---

## 1. Purpose and scope

**Diagram-Ops** converts natural-language descriptions into rendered technical diagrams. A user types a plain-English description of a process, system, or data model; a large language model converts it into [Mermaid](https://mermaid.js.org/) syntax; the browser renders it; the user can edit, save, and export it.

**In scope for the application:** authentication, diagram generation via LLM with provider failover, persistence, export, and the operational endpoints the platform needs.

**The application is deliberately minimal.** Its purpose is to be a *realistic but comprehensible* workload for the DevOps platform built in Phases 2–16. Requirements that would add application complexity without adding platform learning value are explicitly listed as [out of scope](#9-out-of-scope).

### A note on authentication

Authentication was **not** in the original phase plan. It is included here because without it:

- `DELETE /api/diagrams/:id` lets any visitor delete any other visitor's saved work.
- `POST /api/diagrams/generate` is a public, unauthenticated endpoint that **spends money on every call** once Phase 10 puts it on a real domain.

Both are unacceptable in a system described as production-standard, and neither is fixed by the cluster-level hardening in Phase 12 — that phase secures the *cluster*, not the *application*. The auth surface here is deliberately the smallest thing that closes the hole: email + password, bcrypt, JWT. Roughly 150 lines.

Requirements marked **`[DEFERRABLE]`** can be dropped from Phase 1 and added in a later phase if you want the smallest possible first milestone. Nothing else can.

---

## 2. Actors

| Actor | Type | Description |
|---|---|---|
| **Guest** | Human | An unauthenticated visitor. Can register, log in, and view the landing page. Nothing else. |
| **Registered User** | Human | The primary actor. Generates, saves, edits, exports, and deletes **their own** diagrams. |
| **Operator** | Human | You, wearing your SRE hat. Reads Grafana dashboards, responds to alerts, runs restore drills. Interacts with the platform, not the app UI. |
| **LLM Provider** | External system | Groq (primary) and Anthropic Claude (fallback). Converts text to Mermaid syntax. |
| **Backup Scheduler** | System | Kubernetes CronJob. Runs `mongodump` nightly to S3. Phase 11. |
| **Metrics Scraper** | System | Prometheus. Polls `/metrics` every 15 seconds. Phase 9. |
| **GitOps Reconciler** | System | ArgoCD. Keeps the cluster matching Git. Phase 8. |

---

## 3. Functional requirements

Priority uses [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) keywords: **MUST** (Phase 1 blocker), **SHOULD** (Phase 1 target, may slip), **MAY** (nice to have).

### 3.1 Authentication and accounts — `FR-A*`

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| **FR-A1** | A Guest can register with an email address and a password. | MUST | 1 |
| **FR-A2** | A Guest can log in with valid credentials and receive a signed JWT. | MUST | 1 |
| **FR-A3** | Passwords are stored only as bcrypt hashes (cost factor ≥ 12). Plaintext passwords are never logged, stored, or returned. | MUST | 1 |
| **FR-A4** | Requests to protected routes without a valid, unexpired token are rejected with `401`. | MUST | 1 |
| **FR-A5** | Registration rejects an email that is already in use, with a `409`. | MUST | 1 |
| **FR-A6** | The JWT signing secret is supplied by environment variable and never committed. | MUST | 1 |
| **FR-A7** | A logged-in user can log out (client discards the token). | SHOULD | 1 |
| **FR-A8** | Tokens expire after a configurable TTL (default 24h). | SHOULD | 1 |
| **FR-A9** | A user can change their password. | MAY | later |

### 3.2 Diagram generation — `FR-G*`

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| **FR-G1** | A Registered User can submit a natural-language description (1–2000 characters). | MUST | 1 |
| **FR-G2** | The system infers the appropriate diagram type from the description, or honours an explicitly requested type. | MUST | 1 |
| **FR-G3** | The system calls an LLM and receives a JSON object containing `diagramType`, `title`, and `mermaidSyntax`. | MUST | 1 |
| **FR-G4** | The system validates that the returned syntax actually matches the declared diagram type. On mismatch it retries **once**, using **the same provider that responded**. | MUST | 1 |
| **FR-G5** | If the primary provider fails, the system automatically falls back to the secondary provider. | SHOULD | 1 |
| **FR-G6** | The system enforces a configurable daily call cap on the *paid* provider and returns `429` with a clear message once exceeded. | SHOULD | 1 |
| **FR-G7** | Generation does **not** persist anything. A user must explicitly save. | MUST | 1 |
| **FR-G8** | Supported diagram types: `flowchart`, `sequence`, `class`, `er`, `state`, `gantt`, `mindmap`. | MUST | 1 |
| **FR-G9** | If the LLM returns unparseable output after the retry, the user gets a `502` with an actionable message — never a stack trace. | MUST | 1 |

### 3.3 Diagram management — `FR-D*`

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| **FR-D1** | A user can save a generated diagram with a title. | MUST | 1 |
| **FR-D2** | A user can list their saved diagrams, newest first, paginated (default 20 per page). | MUST | 1 |
| **FR-D3** | A user can open a single saved diagram and see it re-rendered. | MUST | 1 |
| **FR-D4** | A user can manually edit the Mermaid syntax and see the render update live. | SHOULD | 1 |
| **FR-D5** | A user can update the title and syntax of a saved diagram. | SHOULD | 1 |
| **FR-D6** | A user can delete their own diagram. | MUST | 1 |
| **FR-D7** | **A user can read, update, and delete only their own diagrams.** Any attempt on another user's diagram returns `404` (not `403` — we don't confirm existence). | MUST | 1 |
| **FR-D8** | Invalid Mermaid syntax renders an inline error message without crashing the page. | MUST | 1 |

### 3.4 Export — `FR-E*`

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| **FR-E1** | A user can download the rendered diagram as SVG. | SHOULD | 1 |
| **FR-E2** | A user can download the rendered diagram as PNG. | MAY | 1 |
| **FR-E3** | A user can copy the raw Mermaid source to the clipboard. | SHOULD | 1 |

### 3.5 Operational endpoints — `FR-O*`

These exist for the *platform*, not the user. They are what makes the app deployable.

| ID | Requirement | Priority | Phase |
|---|---|---|---|
| **FR-O1** | `GET /healthz` returns `200` whenever the process is alive. Used as the Kubernetes **liveness** probe. Never rate-limited, never authenticated. | MUST | 1 |
| **FR-O2** | `GET /readyz` returns `200` only when MongoDB is reachable, else `503`. Used as the **readiness** probe. | MUST | 1 |
| **FR-O3** | `GET /metrics` exposes Prometheus metrics. Not exposed through the public Ingress. | MUST | 9 |
| **FR-O4** | `GET /api/provider-status` reports today's paid-provider usage against the cap. | SHOULD | 1 |
| **FR-O5** | Every log line is structured JSON and carries a request ID propagated from `x-request-id`. | SHOULD | 15 |
| **FR-O6** | On `SIGTERM` the server stops accepting new connections, finishes in-flight requests, closes the DB connection, then exits. | MUST | 1 |

> **Why FR-O1 and FR-O2 are different endpoints.** Liveness answers "should Kubernetes kill and restart this container?" Readiness answers "should Kubernetes send it traffic?" Conflating them is a classic and painful mistake: if your liveness probe checks the database, then a brief database blip causes Kubernetes to *restart every pod simultaneously*, turning a 10-second outage into a 5-minute one.

---

## 4. Non-functional requirements

These are the requirements the DevOps phases exist to satisfy. Each maps to something you will actually measure.

### 4.1 Performance — `NFR-P*`

| ID | Requirement | How it's verified |
|---|---|---|
| **NFR-P1** | 95% of diagram generations complete within 10 seconds. | Prometheus histogram `diagram_generation_duration_seconds` (Phase 9) |
| **NFR-P2** | 95% of non-LLM API requests complete within 300 ms. | `http_request_duration_seconds` by route |
| **NFR-P3** | Initial page load transfers under 500 KB gzipped. | Vite build output; Lighthouse |

### 4.2 Availability and reliability — `NFR-A*`

| ID | Requirement | How it's verified |
|---|---|---|
| **NFR-A1** | **SLO:** 99% of `/api/diagrams/generate` requests return non-5xx over a rolling 7 days. | Prometheus recording rule + burn-rate alert (Phase 15) |
| **NFR-A2** | Losing a single backend pod causes no user-visible error. | Chaos test: `kubectl delete pod` under load (Phase 16) |
| **NFR-A3** | Deploys cause zero downtime. | Rolling update + readiness probes (Phase 7); canary (Phase 14) |
| **NFR-A4** | **RTO ≤ 45 minutes, RPO ≤ 24 hours.** | Timed restore drill (Phase 11 and 16) |

### 4.3 Security — `NFR-S*`

| ID | Requirement | How it's verified |
|---|---|---|
| **NFR-S1** | No secret is ever present in Git, in a container image layer, or in a log line. | `.gitignore` patterns, Trivy secret scan, code review |
| **NFR-S2** | Every container runs as a non-root user with a read-only root filesystem and no added capabilities. | Pod Security Standards `restricted` (Phase 12) |
| **NFR-S3** | All external traffic is HTTPS; HTTP redirects to HTTPS. | ACM certificate on the ALB (Phase 10) |
| **NFR-S4** | The generation endpoint is rate-limited per authenticated user, correctly identifying the real client IP behind the load balancer. | `trust proxy` + `express-rate-limit` keyed on user ID |
| **NFR-S5** | A build fails if any dependency has a CVE with CVSS ≥ 8, or the image has a HIGH/CRITICAL fixable vulnerability. | OWASP Dependency-Check + Trivy (Phase 6) |
| **NFR-S6** | Pods can only reach the specific services they need — default-deny network policy. | NetworkPolicy (Phase 12) |
| **NFR-S7** | The cluster refuses to run an image not signed by our pipeline. | Cosign + Kyverno (Phase 13) |

### 4.4 Scalability — `NFR-SC*`

| ID | Requirement | How it's verified |
|---|---|---|
| **NFR-SC1** | Backend scales from 3 to 10 pods when average CPU exceeds 70%. | HPA + load test (Phase 7, 16) |
| **NFR-SC2** | The backend is stateless — any pod can serve any request. | No in-memory sessions; JWT carries identity |

### 4.5 Observability — `NFR-O*`

| ID | Requirement | How it's verified |
|---|---|---|
| **NFR-O1** | Request rate, error rate, and latency are visible per route in Grafana. | Phase 9 dashboard |
| **NFR-O2** | Logs survive container restarts and are queryable by request ID. | Loki (Phase 15) |
| **NFR-O3** | A single request can be traced across frontend → backend → LLM → MongoDB. | OpenTelemetry + Tempo (Phase 15) |
| **NFR-O4** | Every alert links to a runbook. | `runbook_url` annotation (Phase 15) |

### 4.6 Cost — `NFR-C*`

| ID | Requirement | How it's verified |
|---|---|---|
| **NFR-C1** | Total AWS spend stays under **$40/month** with disciplined teardown. | AWS Budget alert at 60% (Phase 0) |
| **NFR-C2** | Paid LLM spend is hard-capped per day and cannot run away. | `DAILY_CLAUDE_CALL_CAP`, enforced server-side (FR-G6) |
| **NFR-C3** | Every AWS resource carries `Project`, `Environment`, `ManagedBy`, `Owner` tags. | Terraform default tags (Phase 16) |

---

## 5. Detailed use cases

### UC-1 — Generate a diagram

| Field | Value |
|---|---|
| **Actor** | Registered User |
| **Goal** | Turn a text description into a rendered diagram |
| **Preconditions** | User is authenticated; at least one LLM provider is reachable |
| **Postconditions** | A diagram is displayed. Nothing is persisted yet. |
| **Requirements** | FR-G1 … FR-G9 |

**Main flow**

1. User types a description into the input box and clicks **Generate**.
2. Frontend `POST`s `{ text }` to `/api/diagrams/generate` with the bearer token.
3. Backend validates the input length and the token.
4. Backend builds a system prompt and calls the **primary** LLM provider.
5. Provider returns text; backend strips any markdown code fences and parses JSON.
6. Backend validates that `mermaidSyntax` actually starts with a marker matching `diagramType`.
7. Backend returns `201` with `{ diagramType, title, mermaidSyntax, providerUsed }`.
8. Frontend renders the syntax with Mermaid and shows the diagram plus a **Save** button.

**Alternate flows**

| # | Condition | Behaviour |
|---|---|---|
| A1 | Response isn't valid JSON | Retry once with the **same** provider (FR-G4). Still bad → `502` (FR-G9). |
| A2 | Syntax doesn't match declared type | Retry once with the same provider, appending a corrective instruction. |
| A3 | Primary provider errors or times out | Fall back to secondary (FR-G5). Response includes which provider was used. |
| A4 | Fallback provider is over its daily cap | Return `429` with the cap and reset time (FR-G6). No call is made. |
| A5 | Both providers fail | Return `503`. |
| A6 | Input exceeds 2000 characters | Return `400` before any LLM call — never spend money on invalid input. |

> **Why the retry is "sticky" (A1, A2).** If retrying re-entered the fallback logic, one malformed response from the free provider would silently escalate to the paid provider. Sticky retry means a formatting problem is retried where it happened, and only a genuine *failure* triggers failover. This distinction is the difference between a $0.60 month and a $60 month.

---

### UC-2 — Save and retrieve a diagram

| Field | Value |
|---|---|
| **Actor** | Registered User |
| **Goal** | Persist a diagram and find it again later |
| **Preconditions** | A diagram has been generated (UC-1) |
| **Postconditions** | A `Diagram` document exists, owned by this user |
| **Requirements** | FR-D1, FR-D2, FR-D3, FR-D7 |

**Main flow**

1. User clicks **Save**, optionally editing the auto-suggested title.
2. Frontend `POST`s the full diagram to `/api/diagrams`.
3. Backend attaches `userId` **from the verified JWT, never from the request body**.
4. Backend persists the document and returns `201` with the new ID.
5. Later, the user opens **My Diagrams**; frontend `GET`s `/api/diagrams?page=1`.
6. Backend returns only documents where `userId` matches the token's subject.

**Alternate flows**

| # | Condition | Behaviour |
|---|---|---|
| A1 | Title is empty | Derive it from the LLM-supplied `title`, or the first 50 characters of the source text. |
| A2 | User requests an ID they don't own | `404`. |
| A3 | Malformed ObjectId in the URL | `400`, without touching the database. |

> **Why A2 returns `404` and not `403`.** Returning `403` confirms the resource exists. That's an information leak — an attacker can enumerate valid IDs by watching which ones return `403` versus `404`. Return `404` for both "doesn't exist" and "not yours."

> **Why step 3 says "never from the request body."** If the server trusted a `userId` field sent by the client, any user could save diagrams as — or read diagrams belonging to — anyone else. Identity comes from the verified token, always. This class of bug is [OWASP API1: Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/), the single most common API vulnerability in the wild.

---

### UC-3 — Provider failover (system use case)

| Field | Value |
|---|---|
| **Actor** | Backend service (no human) |
| **Trigger** | Primary provider returns an error, times out, or is rate-limited |
| **Goal** | Serve the user despite a degraded dependency, without unbounded cost |
| **Requirements** | FR-G5, FR-G6, NFR-C2 |

**Main flow**

1. Primary provider call throws.
2. Backend logs a structured warning with the provider name and error.
3. Backend increments `llm_provider_failures_total{provider="groq"}`.
4. Backend checks the daily cap for the paid provider.
5. Under cap → call the fallback, record usage, increment `claude_fallback_daily_usage`.
6. Return the result, tagged with `providerUsed: "claude"`.
7. Prometheus alert `PrimaryProviderDegraded` fires if the fallback rate exceeds 20% for 15 minutes.

**Alternate flow**

| # | Condition | Behaviour |
|---|---|---|
| A1 | Cap reached | Throw `DailyCapExceededError` → `429`. Do **not** call the paid provider. |

---

## 6. API contract

Base path: `/api`. All responses are JSON. All protected routes require `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Purpose | Success | Errors |
|---|---|---|---|---|---|
| `POST` | `/auth/register` | — | Create an account | `201` | `400`, `409` |
| `POST` | `/auth/login` | — | Exchange credentials for a JWT | `200` | `400`, `401` |
| `GET` | `/auth/me` | ✅ | Current user profile | `200` | `401` |
| `POST` | `/diagrams/generate` | ✅ | Text → Mermaid | `201` | `400`, `401`, `429`, `502`, `503` |
| `POST` | `/diagrams` | ✅ | Save a diagram | `201` | `400`, `401` |
| `GET` | `/diagrams` | ✅ | List own diagrams, paginated | `200` | `401` |
| `GET` | `/diagrams/:id` | ✅ | Fetch one | `200` | `400`, `401`, `404` |
| `PATCH` | `/diagrams/:id` | ✅ | Update title/syntax | `200` | `400`, `401`, `404` |
| `DELETE` | `/diagrams/:id` | ✅ | Delete own diagram | `204` | `400`, `401`, `404` |
| `GET` | `/provider-status` | ✅ | Today's paid usage vs cap | `200` | `401` |
| `GET` | `/healthz` | — | Liveness probe | `200` | — |
| `GET` | `/readyz` | — | Readiness probe | `200` | `503` |
| `GET` | `/metrics` | — | Prometheus scrape (cluster-internal only) | `200` | — |

### Representative payloads

**`POST /api/diagrams/generate`**
```jsonc
// request
{ "text": "user submits an order, we check stock, if available charge the card and ship, otherwise refund" }

// 201 response
{
  "diagramType": "flowchart",
  "title": "Order Fulfilment Flow",
  "mermaidSyntax": "flowchart TD\n    A[Order submitted] --> B{In stock?}\n    B -->|Yes| C[Charge card]\n    C --> D[Ship]\n    B -->|No| E[Refund]",
  "providerUsed": "groq"
}
```

**`GET /api/diagrams?page=1&limit=20`**
```jsonc
{
  "data": [
    { "id": "665f...", "title": "Order Fulfilment Flow", "diagramType": "flowchart", "createdAt": "2026-08-13T09:14:22.000Z" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 37, "totalPages": 2 }
}
```

**Error envelope — identical shape for every failure**
```jsonc
{
  "error": {
    "code": "DAILY_CAP_EXCEEDED",
    "message": "Daily call cap (50) reached for \"claude\". Please try again tomorrow.",
    "requestId": "0f3c1a5e-9b21-4c8e-8f2a-7d6e5b4c3a21"
  }
}
```

> One consistent error shape means the frontend has one error handler, not twelve. Including `requestId` means a user can paste it into a bug report and you can find the exact log line in Loki.

---

## 7. Data validation rules

Validation happens at the **edge**, before any expensive work. Every rule below is enforced server-side; client-side checks are a convenience, never a control.

| Field | Rule |
|---|---|
| `email` | RFC-5322 shape, lowercased before storage, unique index |
| `password` | 8–128 characters, at least one letter and one digit |
| `text` (generation input) | 1–2000 characters after trimming, non-empty |
| `title` | 1–120 characters |
| `mermaidSyntax` | 1–20 000 characters; must begin with a marker matching `diagramType` |
| `diagramType` | Enum — one of the seven types in FR-G8 |
| `:id` path parameter | Valid 24-character hex ObjectId, checked before any query |
| `page`, `limit` | Positive integers; `limit` capped at 100 to prevent a scrape-the-whole-DB request |

---

## 8. Error catalogue

| HTTP | `code` | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Input failed a rule in §7 |
| `401` | `UNAUTHENTICATED` | Missing, malformed, or expired token |
| `404` | `NOT_FOUND` | Resource absent **or** not owned by the caller (FR-D7) |
| `409` | `EMAIL_IN_USE` | Registration with an existing email |
| `429` | `RATE_LIMITED` | Per-user request rate exceeded |
| `429` | `DAILY_CAP_EXCEEDED` | Paid-provider daily cap reached (FR-G6) |
| `502` | `LLM_INVALID_OUTPUT` | Provider responded, but output was unusable after retry |
| `503` | `LLM_UNAVAILABLE` | All providers failed |
| `503` | `NOT_READY` | Readiness probe: MongoDB unreachable |
| `500` | `INTERNAL_ERROR` | Anything unhandled. Message is generic; details go to logs only. |

> **`500` never leaks internals.** The client sees `"Something went wrong"` plus a request ID. The stack trace goes to the structured log. Stack traces in HTTP responses tell an attacker your framework versions and file paths.

---

## 9. Out of scope

Explicitly excluded, so that scope creep is a decision rather than an accident:

| Not building | Why |
|---|---|
| Real-time collaborative editing | Large app complexity, zero platform learning |
| Public share links / permissions matrix | Same |
| Diagram version history | Same |
| Teams, organisations, roles beyond "owner" | Same |
| OAuth / social login | Adds a third-party dependency without teaching anything new |
| Email verification, password reset | Requires an email provider; adds a whole delivery concern |
| Mobile applications | Responsive web is sufficient |
| Diagram templates gallery | Pure product feature |
| Multi-region active-active | Cost far exceeds learning value; Phase 16 documents it as a known limitation instead |

> Each row is a place where a real product would keep going and this project deliberately stops. Being able to say *why* you stopped is itself an engineering signal — "we scoped this out because it added application complexity without adding platform capability" is a much better answer than not having thought about it.
