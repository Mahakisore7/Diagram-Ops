# Diagram-Ops

Cloud-native DevOps learning project built around a minimal AI-powered diagram generation app.

The application is intentionally small: paste text, generate Mermaid syntax with an LLM, render the diagram, and save/export it. The real learning value is the production-style platform around it: Docker, Terraform, Jenkins, ECR, EKS, Helm, ArgoCD, observability, security, backups, release strategies, and cost controls.

## Why This Project Exists

Diagram-Ops is designed for learning DevOps and cloud engineering without getting lost in application complexity. Instead of building a huge product, the app stays useful and understandable while the infrastructure grows phase by phase into something close to an industry deployment workflow.

## Start Here

| Document | What it covers |
|---|---|
| **[Project Overview](docs/project-overview.md)** | What every tool is for, in plain language with examples. The life of a commit. Real AWS costs. Start here. |
| **[Functional Specification](docs/functional-spec.md)** | Actors, functional and non-functional requirements, use cases, API contract, error catalogue. |
| **[System Design](docs/system-design.md)** | ER model, use case / class / sequence / activity / state / component / deployment diagrams, design decisions. |
| **[Phases](docs/Phases/)** | Step-by-step build instructions, Phase 0 through Phase 16. |

The phase files tell you *what to type*; the three documents above tell you *what it means* and *why it's shaped that way*.

## Phase Roadmap

| Phase | Focus | Main Learning Outcome |
|---|---|---|
| 1 | Minimal application | React, Express, MongoDB, Mermaid, local Docker Compose |
| 2 | Jenkins infrastructure | Terraform modules, EC2, VPC, IAM, remote state |
| 3 | Jenkins configuration | JCasC, credentials, toolchain setup, SonarQube |
| 4 | EKS cluster | Kubernetes on AWS, node groups, IRSA, ALB controller |
| 5 | ECR | Private registries, immutable tags, lifecycle policies |
| 6 | CI gates | Jenkins pipelines, tests, SonarQube, OWASP, Trivy |
| 7 | Helm | Templated Kubernetes manifests, probes, HPA, StatefulSet |
| 8 | GitOps | ArgoCD App-of-Apps, auto-sync, self-healing |
| 9 | Observability | Prometheus, Grafana, application metrics, alerts |
| 10 | DNS and TLS | Route53, ACM certificates, HTTPS through ALB |
| 11 | Persistence and backup | EBS CSI, S3 backups, restore testing |
| 12 | Security hardening | External Secrets, NetworkPolicy, RBAC, Pod Security |
| 13 | Supply chain and policy | SBOM, image signing, admission policies, IaC scanning |
| 14 | Progressive delivery | Argo Rollouts, canary releases, metric-based rollback |
| 15 | Logs, traces, and incidents | Loki, OpenTelemetry, runbooks, SLOs |
| 16 | FinOps and resilience | Budgets, Karpenter, chaos tests, disaster recovery |

## Current Status

**Phase 1 is complete.** The application — React frontend, Express backend, MongoDB, JWT auth, multi-provider LLM generation with fallback and a daily cost cap — is built, tested (46 Jest tests + a real-browser Playwright verification), containerized, and running as a three-tier stack via Docker Compose. The next practical step is Phase 2: standing up the Jenkins infrastructure with Terraform.

Run it locally:

```bash
cd application
cp .env.example .env   # add real GROQ_API_KEY / ANTHROPIC_API_KEY if you have them
docker compose up --build
```

Frontend at `http://localhost:5173`, backend directly at `http://localhost:5000` (dev convenience only — the frontend's nginx `/api` proxy is the real path, see [ADR-0007](docs/adr/0007-nginx-api-proxy.md)).

## Guiding Principle

Keep the app simple. Make the platform serious.
