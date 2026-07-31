# Phase 16 - FinOps, Resilience, and Production Readiness
### Cost Controls, Autoscaling, Chaos Testing, Disaster Recovery, and Final Review

---

## Overview

Phase 16 is the final cloud-operator phase. It answers the questions a real team eventually asks:

- How much does this cost?
- What scales automatically?
- What happens when something fails?
- Can we restore from backups?
- Is the system documented enough for another engineer to operate?

This phase is about discipline, not new shiny tools.

---

## 16.1 - AWS Budgets and Cost Alerts

Create monthly budget alerts:

- Total project budget
- EKS-specific cost
- NAT/Load Balancer cost
- EBS and snapshot cost

Tag every AWS resource consistently:

```hcl
tags = {
  Project     = "diagram-ops"
  Environment = var.environment
  ManagedBy   = "terraform"
  Owner       = "learning"
}
```

Add a `cost-review.md` file with:

- Current monthly estimate
- Biggest cost drivers
- What can be destroyed when not in use
- How to tear down safely

---

## 16.2 - Autoscaling Improvements

Start with HPA from Phase 7. Then learn cluster-level scaling:

Option A - Cluster Autoscaler:

- Easier to understand
- Scales managed node groups

Option B - Karpenter:

- More modern and flexible
- Great learning value for real EKS operations
- Can choose cheaper instance types dynamically

For this project, use Karpenter as the stretch goal after HPA is proven.

What to verify:

- Backend pods scale under CPU load
- New nodes appear when pods cannot be scheduled
- Nodes scale down after load disappears
- PodDisruptionBudgets prevent unsafe voluntary disruption

---

## 16.3 - Chaos Testing

Use simple chaos before installing a large chaos platform.

Manual tests:

```bash
kubectl delete pod -n diagramforge -l app=<backend-label>
kubectl delete pod -n diagramforge -l app=<mongodb-label>
kubectl scale deployment -n diagramforge <backend> --replicas=0
```

Then add LitmusChaos or Chaos Mesh as an optional stretch:

- Pod kill experiment
- Node drain experiment
- Network latency experiment
- DNS failure experiment

The point is not breaking things for fun. The point is proving alerts fire, rollbacks work, and runbooks are useful.

---

## 16.4 - Disaster Recovery Drill

Run a full restore drill:

1. Deploy a fresh namespace or fresh cluster.
2. Restore MongoDB from S3 backup.
3. Re-sync applications through ArgoCD.
4. Confirm the app serves old saved diagrams.
5. Record recovery time.

Track:

- RTO: how long recovery took
- RPO: how much data could be lost since last backup

For a learning project, even writing down "RTO: 45 minutes, RPO: 24 hours" is valuable. It shows you understand the trade-off.

---

## 16.5 - Production Readiness Review

Create:

```text
docs/production-readiness-review.md
```

Checklist sections:

- Architecture
- Security
- CI/CD
- Observability
- Backup and restore
- Cost
- Reliability
- Known limitations
- Future improvements

Known limitations should be honest. Examples:

- MongoDB is single-replica unless upgraded to a managed database or replica set.
- Jenkins is a single EC2 instance unless made highly available.
- Public worker nodes were chosen earlier for learning cost reasons.
- Some alerts notify only locally unless Slack/Email integration is configured.

Honest limitations are a strength in a learning project. They show engineering judgment.

---

## Final Verification Checklist

- [ ] AWS monthly budget alert exists
- [ ] All Terraform resources have cost/ownership tags
- [ ] HPA has been load-tested
- [ ] Cluster autoscaling has been tested or explicitly documented as future work
- [ ] At least three chaos scenarios were practiced
- [ ] A backup restore drill was completed
- [ ] RTO and RPO are documented
- [ ] Production readiness review exists
- [ ] Teardown procedure is documented and tested

---

## Final Outcome

At this point Diagram-Ops is no longer just an app deployment. It is a compact but serious cloud-native platform project that demonstrates:

- Application containerization
- Infrastructure as Code
- CI/CD
- GitOps
- Kubernetes operations
- Observability
- Security hardening
- Supply chain security
- Progressive delivery
- Backup and recovery
- Cost management
- Reliability testing
