# Diagram-Ops — System Design

### ER model, UML diagrams, and architecture

> Every diagram on this page is written in **Mermaid** and renders directly on GitHub. That is deliberate: this project's own application generates Mermaid, so the design documentation is written in the format the product produces. The source is plain text, so it diffs in pull requests like code — unlike a screenshot of a drawing tool.

**Companion documents**
- [functional-spec.md](functional-spec.md) — requirements referenced here as `FR-*` / `NFR-*`
- [project-overview.md](project-overview.md) — what each tool is and why
- [Phases/](Phases/) — the build instructions

---

## Contents

1. [System context](#1-system-context)
2. [Use case diagram](#2-use-case-diagram)
3. [ER diagram and data model](#3-er-diagram-and-data-model)
4. [Class diagram](#4-class-diagram)
5. [Sequence diagrams](#5-sequence-diagrams)
6. [Activity diagram](#6-activity-diagram)
7. [State diagram](#7-state-diagram)
8. [Component diagram](#8-component-diagram)
9. [Deployment diagram](#9-deployment-diagram)
10. [Design decisions](#10-design-decisions)

---

## 1. System context

The outermost view: who and what Diagram-Ops talks to.

```mermaid
flowchart TB
    User["Registered User<br/>(web browser)"]
    Operator["Operator / SRE"]

    subgraph boundary["Diagram-Ops System"]
        App["Diagram-Ops<br/>React SPA + Express API + MongoDB"]
        Platform["Platform<br/>EKS, ArgoCD, Prometheus, Grafana"]
    end

    Groq["Groq API<br/>primary LLM provider"]
    Claude["Anthropic API<br/>fallback LLM provider"]
    AWS["AWS Services<br/>ECR, S3, Secrets Manager, Route53"]
    GitHub["GitHub<br/>source of truth"]

    User -->|"HTTPS: describe, view, save"| App
    Operator -->|"dashboards, alerts"| Platform
    Operator -->|"git push"| GitHub
    App -->|"text to Mermaid"| Groq
    App -.->|"on primary failure"| Claude
    App -->|"secrets, backups"| AWS
    GitHub -->|"webhook / GitOps sync"| Platform
    Platform -->|"runs"| App
```

Two things worth noticing:

- **The Operator never touches the application directly.** They interact through Git and through dashboards. That separation is the entire point of GitOps.
- **The dotted line to Claude** is the failover path. It is exercised rarely by design, which is exactly why it needs an automated test (`FR-G5`) — untested failover is not failover.

---

## 2. Use case diagram

> Mermaid has no native use-case notation, so this uses actors as circles and use cases as stadium shapes inside a system boundary — the standard UML reading still applies.

```mermaid
flowchart LR
    Guest(("Guest"))
    User(("Registered<br/>User"))
    LLM(("LLM Provider<br/>«system»"))
    Scheduler(("Scheduler<br/>«system»"))

    subgraph sys["Diagram-Ops"]
        direction TB
        UC1(["Register account"])
        UC2(["Log in"])
        UC3(["Generate diagram<br/>from text"])
        UC4(["Render diagram"])
        UC5(["Save diagram"])
        UC6(["List own diagrams"])
        UC7(["View diagram"])
        UC8(["Edit Mermaid syntax"])
        UC9(["Delete diagram"])
        UC10(["Export as SVG / PNG"])
        UC11(["Check provider usage"])
        UC12(["Back up database"])
        UC13(["Fail over to<br/>secondary provider"])
    end

    Guest --- UC1
    Guest --- UC2
    User --- UC3
    User --- UC5
    User --- UC6
    User --- UC7
    User --- UC8
    User --- UC9
    User --- UC10
    User --- UC11

    UC3 -.->|"«include»"| UC4
    UC7 -.->|"«include»"| UC4
    UC8 -.->|"«include»"| UC4
    UC3 -.->|"«extend»"| UC13

    UC3 --- LLM
    UC13 --- LLM
    UC12 --- Scheduler
```

**Reading the relationships**

- **`«include»`** — the base use case *always* performs the included one. Generating, viewing, and editing all necessarily render. Rendering is factored out because it's the same behaviour in three places.
- **`«extend»`** — the extending use case happens *conditionally*. Failover extends generation because it only occurs when the primary provider fails.

---

## 3. ER diagram and data model

### A necessary caveat

MongoDB is a **document database**, not a relational one. There are no foreign-key constraints, no joins, and no schema enforced by the engine. So an ER diagram here describes the **logical** model our application enforces at the Mongoose layer — not constraints the database guarantees.

This is worth stating plainly rather than glossing over, because it has a real consequence: **referential integrity is the application's job.** If you delete a `USER`, nothing in MongoDB automatically removes their `DIAGRAM` documents. Our code must do it.

```mermaid
erDiagram
    USER ||--o{ DIAGRAM : "creates"

    USER {
        ObjectId _id PK "auto-generated"
        string email UK "lowercased, unique index"
        string passwordHash "bcrypt, cost 12, never returned by the API"
        date createdAt "auto"
        date updatedAt "auto"
    }

    DIAGRAM {
        ObjectId _id PK "auto-generated"
        ObjectId userId FK "indexed, references USER._id"
        string title "1-120 chars"
        string sourceText "the natural-language input, 1-2000 chars"
        string diagramType "enum: flowchart|sequence|class|er|state|gantt|mindmap"
        string mermaidSyntax "the generated diagram source"
        string providerUsed "groq | claude"
        number generationMs "how long the LLM call took"
        date createdAt "auto"
        date updatedAt "auto"
    }

    PROVIDER_USAGE {
        ObjectId _id PK "auto-generated"
        string date "YYYY-MM-DD"
        string provider "groq | claude"
        number count "calls made today"
    }
```

### Cardinality

| Relationship | Cardinality | Meaning |
|---|---|---|
| `USER` → `DIAGRAM` | **1 : 0..N** | A user may have no diagrams or many. Every diagram has exactly one owner. |
| `PROVIDER_USAGE` | *standalone* | Not related to users. It's a global daily counter, deliberately not per-user. |

`PROVIDER_USAGE` has no relationship line because it is an **aggregate**, not an entity in the domain. Its unique compound index on `(date, provider)` is what makes the daily cap correct — it guarantees exactly one counter row per provider per day, so two concurrent requests can't create two competing counters.

### Indexes and why each exists

| Collection | Index | Purpose |
|---|---|---|
| `USER` | `{ email: 1 }` unique | Enforces `FR-A5`; makes login lookup O(log n) |
| `DIAGRAM` | `{ userId: 1, createdAt: -1 }` | Powers `FR-D2` — "my diagrams, newest first" — in a single index scan |
| `PROVIDER_USAGE` | `{ date: 1, provider: 1 }` unique | Makes the atomic `findOneAndUpdate` upsert safe under concurrency |

> **Why the compound index order matters.** `{ userId: 1, createdAt: -1 }` — not the reverse. MongoDB can use a compound index when your query filters on a **prefix** of its fields. We always filter by `userId` and *then* sort by date, so `userId` must come first. Reversed, the index would be useless for our most common query and you'd get a collection scan that gets slower every day.

### Design decisions in the data model

| Decision | Rationale |
|---|---|
| Store `sourceText` alongside the generated syntax | Lets you regenerate later with a better model, and gives you real data on what people actually ask for |
| Store `providerUsed` per diagram | Makes "is the free provider good enough?" answerable with a query instead of a guess |
| Store `generationMs` | Feeds `NFR-P1` verification without needing to correlate to Prometheus |
| Embed nothing; reference `userId` | A user could accumulate thousands of diagrams. Embedding them in the user document would eventually hit MongoDB's 16 MB document limit — a genuine production failure mode |
| No `deletedAt` soft delete | Deliberate simplicity. Hard delete, and the nightly backup is the recovery path |

---

## 4. Class diagram

The backend's layered structure. Each layer only knows about the one below it — controllers never touch models directly, services never touch HTTP.

```mermaid
classDiagram
    direction TB

    class AuthController {
        +register(req, res, next) void
        +login(req, res, next) void
        +me(req, res, next) void
    }

    class DiagramController {
        +generate(req, res, next) void
        +save(req, res, next) void
        +list(req, res, next) void
        +getOne(req, res, next) void
        +update(req, res, next) void
        +remove(req, res, next) void
        +providerStatus(req, res, next) void
    }

    class AuthService {
        -SALT_ROUNDS int
        +registerUser(email, password) User
        +authenticate(email, password) string
        +verifyToken(token) TokenPayload
        -hashPassword(plain) string
    }

    class DiagramService {
        +generate(sourceText) GenerationResult
        +saveForUser(userId, dto) Diagram
        +listForUser(userId, page, limit) PagedResult
        +findOwned(userId, id) Diagram
        +deleteOwned(userId, id) boolean
        -buildSystemPrompt(type) string
        -extractJSON(raw) object
        -validateSyntax(type, syntax) boolean
    }

    class CostGuard {
        -DAILY_CAP int
        +canUseFallback(provider) boolean
        +recordUsage(provider) void
        +getTodayUsage() UsageReport
        -todayKey() string
    }

    class ProviderRegistry {
        -primary ILLMProvider
        -fallback ILLMProvider
        +generateWithFallback(systemPrompt, messages) ProviderResult
    }

    class ILLMProvider {
        <<interface>>
        +name string
        +generate(systemPrompt, messages) string
    }

    class GroqProvider {
        -client OpenAI
        -model string
        +name string
        +generate(systemPrompt, messages) string
    }

    class ClaudeProvider {
        -client Anthropic
        -model string
        +name string
        +generate(systemPrompt, messages) string
    }

    class User {
        +ObjectId _id
        +string email
        +string passwordHash
        +date createdAt
        +comparePassword(plain) boolean
        +toJSON() object
    }

    class Diagram {
        +ObjectId _id
        +ObjectId userId
        +string title
        +string sourceText
        +string diagramType
        +string mermaidSyntax
        +string providerUsed
        +number generationMs
        +date createdAt
    }

    class ProviderUsage {
        +ObjectId _id
        +string date
        +string provider
        +number count
    }

    class DailyCapExceededError {
        +status int
        +code string
    }

    AuthController ..> AuthService : uses
    DiagramController ..> DiagramService : uses
    DiagramController ..> CostGuard : uses
    AuthService ..> User : persists
    DiagramService ..> Diagram : persists
    DiagramService ..> ProviderRegistry : delegates
    ProviderRegistry ..> CostGuard : checks cap
    ProviderRegistry ..> DailyCapExceededError : throws
    CostGuard ..> ProviderUsage : persists
    ILLMProvider <|.. GroqProvider : implements
    ILLMProvider <|.. ClaudeProvider : implements
    ProviderRegistry o-- ILLMProvider : holds 2
    User "1" --> "0..*" Diagram : owns
```

### Why this shape

**`ILLMProvider` is the important class.** It's an interface with two implementations, and `ProviderRegistry` depends on the *interface*, not the concrete classes. That is the **Dependency Inversion Principle**, and here it buys three concrete things:

1. Adding a third provider means writing one new class — no changes anywhere else.
2. Tests mock the interface, so the whole test suite runs with zero API calls and zero cost.
3. Swapping which provider is primary is an environment variable, not a code change.

**Controllers are thin on purpose.** They parse the request, call one service method, and shape the response. All business logic lives in services. This is what makes the logic testable without spinning up HTTP — and it's why `DiagramService.generate()` can be unit-tested against a mocked provider in milliseconds.

**`User.toJSON()` exists to delete `passwordHash`.** Mongoose calls it automatically during serialisation, so the hash cannot leak through an API response even if someone carelessly writes `res.json(user)`. Making the safe thing automatic beats remembering to do the safe thing.

---

## 5. Sequence diagrams

### 5.1 Diagram generation — happy path

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant BE as Express API
    participant AU as auth middleware
    participant DS as DiagramService
    participant PR as ProviderRegistry
    participant G as Groq API
    participant M as Prometheus metrics

    U->>FE: types description, clicks Generate
    FE->>+BE: POST /api/diagrams/generate<br/>Bearer token
    BE->>+AU: verify JWT
    AU-->>-BE: userId
    BE->>BE: validate text length (1-2000)
    BE->>+DS: generate(sourceText)
    DS->>DS: buildSystemPrompt()
    DS->>+PR: generateWithFallback(prompt, messages)
    PR->>+G: chat.completions.create()
    G-->>-PR: raw text
    PR-->>-DS: { text, providerUsed: "groq" }
    DS->>DS: extractJSON() strips ``` fences
    DS->>DS: validateSyntax(type, syntax) ✓
    DS->>M: observe duration, inc counter
    DS-->>-BE: { diagramType, title, mermaidSyntax, providerUsed }
    BE-->>-FE: 201 Created
    FE->>FE: mermaid.render()
    FE-->>U: diagram displayed + Save button
```

Note that nothing is written to MongoDB. Generation and persistence are separate operations (`FR-G7`) — the user decides what's worth keeping.

### 5.2 Failover, sticky retry, and the daily cap

This is the most important diagram in the document, because it encodes the cost-control logic.

```mermaid
sequenceDiagram
    participant DS as DiagramService
    participant PR as ProviderRegistry
    participant CG as CostGuard
    participant G as Groq
    participant C as Claude
    participant DB as MongoDB

    DS->>+PR: generateWithFallback(prompt, msgs)
    PR->>+G: generate()
    G--x-PR: 429 rate limited

    Note over PR: primary failed — consider fallback
    PR->>+CG: canUseFallback("claude")
    CG->>+DB: findOne({ date, provider })
    DB-->>-CG: { count: 12 }
    CG-->>-PR: true (12 < 50)

    PR->>+C: generate()
    C-->>-PR: raw text
    PR->>+CG: recordUsage("claude")
    CG->>DB: findOneAndUpdate $inc, upsert
    CG-->>-PR: ok
    PR-->>-DS: { text, providerUsed: "claude" }

    DS->>DS: extractJSON() ✓
    DS->>DS: validateSyntax() ✗ mismatch

    Note over DS,C: STICKY RETRY — reuse claude,<br/>do NOT re-enter the fallback cascade
    DS->>+C: generate() with corrective instruction
    C-->>-DS: corrected text
    DS->>DS: validateSyntax() ✓
```

**The cap-exceeded path:**

```mermaid
sequenceDiagram
    participant DS as DiagramService
    participant PR as ProviderRegistry
    participant CG as CostGuard
    participant G as Groq
    participant C as Claude

    DS->>+PR: generateWithFallback(prompt, msgs)
    PR->>+G: generate()
    G--x-PR: error
    PR->>+CG: canUseFallback("claude")
    CG-->>-PR: false (50 >= 50)
    PR--x-DS: DailyCapExceededError (429)
    Note over C: never called — no spend
```

> **Read the last two lines carefully.** The paid provider is never contacted once the cap is hit. The check happens *before* the call, not after. A cap enforced after the fact isn't a cap — it's a report.

### 5.3 Authentication

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant BE as Express API
    participant AS as AuthService
    participant DB as MongoDB

    rect rgb(240, 245, 255)
    Note over U,DB: Registration
    U->>FE: email + password
    FE->>+BE: POST /api/auth/register
    BE->>+AS: registerUser(email, password)
    AS->>DB: findOne({ email })
    alt email already exists
        AS--x BE: 409 EMAIL_IN_USE
    else available
        AS->>AS: bcrypt.hash(password, 12)
        AS->>DB: insert User
        AS-->>-BE: user (no passwordHash)
    end
    BE-->>-FE: 201 Created
    end

    rect rgb(245, 240, 255)
    Note over U,DB: Login
    U->>FE: email + password
    FE->>+BE: POST /api/auth/login
    BE->>+AS: authenticate(email, password)
    AS->>DB: findOne({ email })
    AS->>AS: bcrypt.compare()
    alt mismatch or user absent
        AS--x BE: 401 UNAUTHENTICATED
    else valid
        AS->>AS: jwt.sign({ sub: userId }, SECRET, 24h)
        AS-->>-BE: token
    end
    BE-->>-FE: 200 { token }
    FE->>FE: store token
    end
```

> **Both failure branches return the same `401`.** Whether the email doesn't exist or the password is wrong, the response is identical. Distinguishing them would let an attacker enumerate which email addresses have accounts.

---

## 6. Activity diagram

The full generation pipeline as a control flow, including every decision point and error exit.

```mermaid
flowchart TD
    Start([User clicks Generate]) --> Validate{"Input valid?<br/>1-2000 chars"}
    Validate -->|No| E400["400 VALIDATION_ERROR"]
    Validate -->|Yes| Auth{"JWT valid?"}
    Auth -->|No| E401["401 UNAUTHENTICATED"]
    Auth -->|Yes| Rate{"Under per-user<br/>rate limit?"}
    Rate -->|No| E429a["429 RATE_LIMITED"]
    Rate -->|Yes| CallPrimary["Call primary provider<br/>Groq"]

    CallPrimary --> PrimaryOK{"Success?"}
    PrimaryOK -->|Yes| Parse
    PrimaryOK -->|No| CheckCap{"Paid provider<br/>under daily cap?"}

    CheckCap -->|No| E429b["429 DAILY_CAP_EXCEEDED"]
    CheckCap -->|Yes| CallFallback["Call fallback provider<br/>Claude"]
    CallFallback --> FallbackOK{"Success?"}
    FallbackOK -->|No| E503["503 LLM_UNAVAILABLE"]
    FallbackOK -->|Yes| Record["Increment daily usage counter"]
    Record --> Parse

    Parse["Strip markdown fences<br/>parse JSON"] --> ParseOK{"Valid JSON?"}
    ParseOK -->|Yes| Verify{"Syntax matches<br/>declared type?"}
    ParseOK -->|No| Retried1{"Already<br/>retried?"}
    Verify -->|Yes| Emit
    Verify -->|No| Retried2{"Already<br/>retried?"}

    Retried1 -->|Yes| E502["502 LLM_INVALID_OUTPUT"]
    Retried1 -->|No| Sticky
    Retried2 -->|Yes| E502
    Retried2 -->|No| Sticky

    Sticky["STICKY RETRY<br/>same provider that responded<br/>+ corrective instruction"] --> Parse

    Emit["Record metrics<br/>duration, provider, type"] --> Return(["201 — return diagram<br/>nothing persisted yet"])

    E400 --> End([End])
    E401 --> End
    E429a --> End
    E429b --> End
    E502 --> End
    E503 --> End
    Return --> End
```

Three properties this flow guarantees, each worth checking against your code once it's written:

1. **Validation happens before any paid call.** An oversized input costs nothing.
2. **The retry can only happen once.** Both `Retried?` gates route to `502` on the second pass, so there is no infinite loop and no runaway spend.
3. **The cap is checked before the fallback call**, not after — so exceeding it costs zero.

---

## 7. State diagram

The lifecycle of a diagram, from the user's point of view.

```mermaid
stateDiagram-v2
    [*] --> Composing : user opens the app

    Composing --> Generating : clicks Generate
    Generating --> Rendered : LLM returns valid syntax
    Generating --> Failed : all providers failed / cap hit
    Failed --> Composing : user edits input and retries

    Rendered --> Persisted : clicks Save
    Rendered --> Composing : discards, starts over
    Rendered --> Editing : manually edits syntax

    Editing --> Rendered : syntax valid, re-renders
    Editing --> SyntaxError : Mermaid parse fails
    SyntaxError --> Editing : user corrects it

    Persisted --> Editing : opens a saved diagram to edit
    Persisted --> Exported : downloads SVG / PNG
    Exported --> Persisted : returns to the diagram
    Persisted --> [*] : deleted

    note right of Failed
        Never persisted.
        A failed generation
        leaves no trace in the DB.
    end note

    note right of SyntaxError
        Rendering fails in isolation.
        The page stays usable — FR-D8.
    end note
```

The transition worth calling out is **`Rendered → Composing`**: discarding is a first-class action. Because generation doesn't persist (`FR-G7`), throwing away a bad result costs nothing and leaves no orphan rows.

---

## 8. Component diagram

The runtime pieces and how they talk.

```mermaid
flowchart TB
    subgraph browser["Browser"]
        UI["React SPA"]
        MER["Mermaid.js<br/>renderer"]
        UI --- MER
    end

    subgraph frontendpod["Frontend Pod"]
        NGX["nginx<br/>serves static build<br/>proxies /api to backend"]
    end

    subgraph backendpod["Backend Pod"]
        direction TB
        MW["Middleware<br/>auth · rate limit · metrics · logging"]
        CTRL["Controllers<br/>auth · diagram"]
        SVC["Services<br/>AuthService · DiagramService · CostGuard"]
        REG["ProviderRegistry"]
        MOD["Mongoose Models<br/>User · Diagram · ProviderUsage"]
        MW --> CTRL --> SVC
        SVC --> REG
        SVC --> MOD
    end

    subgraph datapod["MongoDB StatefulSet"]
        MDB[("MongoDB 7")]
        PVC[("EBS PersistentVolume")]
        MDB --- PVC
    end

    GROQ["Groq API"]
    ANTH["Anthropic API"]
    PROM["Prometheus"]

    UI -->|"HTTPS"| NGX
    NGX -->|"/api → http"| MW
    MOD -->|"mongodb://"| MDB
    REG -->|"HTTPS"| GROQ
    REG -.->|"HTTPS, on failure"| ANTH
    PROM -->|"scrape /metrics"| MW
```

> **Note the `/api` proxy in nginx.** The frontend calls `/api/...` as a *relative* path; nginx forwards it to the backend service. This means the browser only ever talks to one origin — no CORS configuration, no build-time API URL to bake in, and identical behaviour locally under Docker Compose and in production behind the ALB. Baking an absolute API URL into the frontend at build time is the single most common way this architecture breaks, because Vite resolves environment variables at **build** time, not run time.

---

## 9. Deployment diagram

Where everything physically runs, once Phase 10 is complete.

```mermaid
flowchart TB
    Internet(["Internet"])
    Dev["Developer<br/>laptop"]
    GH["GitHub<br/>repo + webhooks"]

    subgraph aws["AWS — ap-south-1"]
        R53["Route53<br/>DNS"]
        ACM["ACM<br/>TLS certificate"]

        subgraph vpc["VPC 10.0.0.0/16"]
            ALB["Application<br/>Load Balancer"]

            subgraph ec2sn["Public Subnet — CI"]
                JEN["EC2 t3.large<br/>Jenkins + SonarQube"]
            end

            subgraph eks["EKS Cluster"]
                direction TB
                subgraph nsapp["namespace: diagramforge"]
                    FE["frontend<br/>Deployment ×2"]
                    BE["backend<br/>Deployment ×3 + HPA"]
                    MG["mongodb<br/>StatefulSet ×1"]
                    EBS[("EBS gp3<br/>PersistentVolume")]
                    MG --- EBS
                end
                subgraph nsmon["namespace: monitoring"]
                    PRM["Prometheus"]
                    GRF["Grafana"]
                    LOK["Loki"]
                end
                subgraph nsargo["namespace: argocd"]
                    ARGO["ArgoCD"]
                    ROLL["Argo Rollouts"]
                end
                subgraph nssec["namespace: external-secrets"]
                    ESO["External Secrets<br/>Operator"]
                end
            end
        end

        ECR[("ECR<br/>container images")]
        S3[("S3<br/>TF state + Mongo backups")]
        SM[("Secrets Manager<br/>API keys, JWT secret")]
    end

    GROQ["Groq API"]
    ANTH["Anthropic API"]

    Internet --> R53 --> ALB
    ACM -.->|"certificate"| ALB
    ALB -->|"/*"| FE
    ALB -->|"/api/*"| BE
    FE --> BE --> MG

    Dev -->|"git push"| GH
    GH -->|"webhook"| JEN
    JEN -->|"push image"| ECR
    JEN -->|"commit new tag"| GH
    GH -->|"pull / sync"| ARGO
    ARGO -->|"kubectl apply"| nsapp
    ROLL -.->|"canary traffic shift"| BE

    ECR -.->|"image pull"| FE
    ECR -.->|"image pull"| BE
    ESO -->|"fetch secrets"| SM
    ESO -.->|"inject as K8s Secret"| BE
    BE --> GROQ
    BE -.-> ANTH
    PRM -->|"scrape"| BE
    GRF --> PRM
    MG -->|"nightly mongodump"| S3
    JEN -->|"terraform state"| S3
```

### Deployment notes

| Aspect | Choice | Reasoning |
|---|---|---|
| Region | `ap-south-1` (Mumbai) | Lowest latency from India; one region everywhere for consistency |
| Worker nodes | Public subnets | Avoids a NAT Gateway at ~$32/month. **A real security trade-off**, made deliberately for cost and documented rather than hidden |
| MongoDB | Single-replica StatefulSet | Honest limitation. Production would use a replica set or DocumentDB — recorded in the Phase 16 readiness review |
| Jenkins | Single EC2, no HA | Same reasoning. It's CI, not the product; downtime blocks deploys but not users |
| Backend replicas | 3, HPA to 10 | Survives losing one pod with room to spare (`NFR-A2`) |
| Secrets | Never in Git or images | ESO pulls from Secrets Manager at runtime (`NFR-S1`) |

> **What "destroy nightly" means on this diagram.** Everything inside the `EKS Cluster` box, plus the ALB, comes down with `terraform destroy` and rebuilds in ~15 minutes. What persists between sessions: ECR images, S3 state and backups, Secrets Manager entries, and the Route53 zone — all of which cost cents. That's how a $215/month architecture becomes a $30/month one.

---

## 10. Design decisions

These are the choices worth defending in a viva or an interview. Each is a candidate for a formal ADR in `docs/adr/`.

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| 1 | JWT stateless auth | Server-side sessions | Sessions need shared state (Redis) across pods. JWT keeps the backend stateless, satisfying `NFR-SC2`, with no extra component to run |
| 2 | Free provider primary, paid fallback | Paid provider only | Turns a per-call cost into a near-zero one, and makes failover a *real, exercised* code path rather than a theoretical one |
| 3 | Sticky retry | Retry through the full fallback chain | A formatting glitch shouldn't escalate to the paid provider. This is the difference between a $0.60 and a $60 month |
| 4 | Cap checked before the call | Cap checked after | A cap enforced after spending isn't a cap |
| 5 | Generation doesn't persist | Auto-save every generation | Users generate many drafts and keep few. Auto-save would fill the DB with noise |
| 6 | `404` for another user's resource | `403` | `403` confirms existence, enabling ID enumeration |
| 7 | nginx proxies `/api` | Build-time `VITE_API_URL` | Vite bakes env vars at build time — one image can't then serve two environments. The proxy makes the image environment-agnostic and eliminates CORS |
| 8 | Reference `userId`, don't embed diagrams | Embed in the user document | MongoDB's 16 MB document limit is a real ceiling a heavy user would eventually hit |
| 9 | Provider behind an interface | Direct SDK calls in the service | Enables zero-cost testing and one-line provider swaps |
| 10 | Mermaid for all design docs | draw.io / Lucidchart images | Diagrams diff in pull requests, render on GitHub, and can't drift out of sync with a binary you forgot to re-export |

---

## Where to go next

With this design agreed, [Phase 1](Phases/phase-1-application.md) becomes an implementation task rather than a design task — the schemas, the class boundaries, the endpoints, and the error codes are all decided.

Build order within Phase 1:

1. `User` model + `AuthService` + auth routes → prove registration and login with `curl`
2. `Diagram` model + CRUD routes with ownership checks → prove `FR-D7` with two accounts
3. `ILLMProvider` + `GroqProvider` → prove generation against one provider
4. `ClaudeProvider` + `ProviderRegistry` + `CostGuard` → prove failover with a deliberately broken API key
5. React frontend + Mermaid renderer
6. Dockerfiles + Compose with the nginx `/api` proxy
7. Jest tests covering `FR-G4`, `FR-G5`, `FR-G6`, `FR-D7`

Each step ends with something demonstrable. If a step can't be demonstrated, don't start the next one.
