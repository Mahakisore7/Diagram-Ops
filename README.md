# Diagram-Ops

Cloud-native DevOps learning project built around a minimal AI-powered diagram generation app.

The application is intentionally small: paste text, generate Mermaid syntax with an LLM, render the diagram, and save/export it. The real learning value is the production-style platform around it: Docker, Terraform, Jenkins, ECR, EKS, Helm, ArgoCD, observability, security, backups, release strategies, and cost controls.

## Why This Project Exists

Diagram-Ops is designed for learning DevOps and cloud engineering without getting lost in application complexity. Instead of building a huge product, the app stays useful and understandable while the infrastructure grows phase by phase into something close to an industry deployment workflow.

## Start Here

New to the project (or to any of the tooling)? Read **[docs/project-overview.md](docs/project-overview.md)** first — it explains what every tool is for, in plain language with examples, plus what the whole thing costs to run. The phase files tell you *what to type*; the overview tells you *what it means*.

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

The repository currently contains the phase-by-phase implementation plan. The next practical step is Phase 1: scaffold the minimal app and prove it works locally before adding cloud infrastructure.

## Guiding Principle

Keep the app simple. Make the platform serious.
