# Phase 15 - Logs, Traces, SLOs, and Incident Response
### Loki, OpenTelemetry, Correlation IDs, Runbooks, and Operational Practice

---

## Overview

Metrics tell you something is wrong. Logs and traces help explain why. Phase 15 adds the missing observability pillars and turns alerts into operational practice with SLOs and runbooks.

This phase keeps the app minimal, but adds just enough instrumentation to make debugging real.

## What This Phase Adds

| Capability | Tooling | Why |
|---|---|---|
| Centralized logs | Loki + Promtail or Grafana Alloy | Query pod logs after containers restart |
| Distributed traces | OpenTelemetry + Tempo | See request flow through frontend/backend/LLM call |
| Correlation IDs | Express middleware | Connect one request across logs and traces |
| SLOs | Prometheus alert rules | Define what "healthy" means |
| Runbooks | Markdown docs | Make incidents repeatable instead of improvised |

---

## 15.1 - Install Loki Stack

```yaml
# gitops/apps/loki.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: loki
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://grafana.github.io/helm-charts
    chart: loki
    targetRevision: "6.6.3"
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]
```

For a learning cluster, keep retention short to control storage cost.

---

## 15.2 - Add Structured Logging

Use JSON logs in the backend:

```bash
cd application/backend
npm install pino pino-http
```

```javascript
// src/middleware/logger.js
const pinoHttp = require('pino-http');
const crypto = require('crypto');

module.exports = pinoHttp({
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
});
```

Every log line should include:

- request ID
- route
- status code
- latency
- error message when applicable

---

## 15.3 - Add OpenTelemetry

Instrument the backend with OpenTelemetry SDK and export traces to Tempo.

Minimum spans worth capturing:

- `POST /api/diagrams/generate`
- Claude/LLM API call duration
- MongoDB save/read operations
- Mermaid generation failures or retries

This makes slow diagram generation diagnosable instead of mysterious.

---

## 15.4 - Define SLOs

Example SLOs:

- Availability: 99% of `/api/diagrams/generate` requests return non-5xx over 7 days.
- Latency: 95% of generation requests complete under 10 seconds over 7 days.
- Reliability: diagram generation failure rate stays under 5%.

Prometheus alert examples:

```yaml
- alert: DiagramForgeSLOFastBurn
  expr: |
    (
      sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))
      /
      sum(rate(http_request_duration_seconds_count[5m]))
    ) > 0.05
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "DiagramForge API error budget is burning quickly"
    runbook_url: "docs/runbooks/high-error-rate.md"
```

---

## 15.5 - Add Runbooks

Create:

```text
docs/runbooks/
  high-error-rate.md
  diagram-generation-slow.md
  mongodb-pvc-full.md
  argocd-sync-failed.md
  rollback-release.md
```

Each runbook should include:

- Symptoms
- Fast checks
- Likely causes
- Commands to inspect
- Rollback or mitigation steps
- How to confirm recovery

---

## Verification Checklist

- [ ] Grafana can query application logs from Loki
- [ ] Backend logs are structured JSON
- [ ] Request IDs appear in logs
- [ ] Traces show backend request flow and LLM duration
- [ ] SLO alerts reference runbooks
- [ ] At least one test incident is practiced end to end

---

## What's Next

Phase 16 adds FinOps and resilience: cost controls, autoscaling improvements, chaos tests, disaster recovery, and a final production-readiness review.
