# Phase 13 - Supply Chain Security and Policy as Code
### SBOMs, Image Signing, Admission Control, IaC Scanning, and Manifest Validation

---

## Overview

Phase 13 teaches a production lesson that many projects learn too late: building an image is not enough. You need to know what is inside it, prove who built it, scan the infrastructure code, and prevent unsafe manifests from entering the cluster.

This phase adds supply chain controls around the existing Jenkins, ECR, Helm, and ArgoCD workflow.

## What This Phase Adds

| Area | Tooling | Purpose |
|---|---|---|
| SBOM | Syft | Generate software bill of materials for images |
| Vulnerability scan | Grype or Trivy | Scan SBOMs and images |
| Image signing | Cosign | Sign pushed images |
| Admission policy | Kyverno | Block unsigned or unsafe workloads |
| IaC scanning | Checkov or tfsec | Catch Terraform and Kubernetes risks before merge |
| Manifest validation | kubeconform, helm lint | Validate rendered manifests in CI |

---

## 13.1 - Generate SBOMs in Jenkins

Install Syft on the Jenkins box:

```bash
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sudo sh -s -- -b /usr/local/bin
```

Add a shared library step:

```groovy
// ci/jenkins/shared-library/vars/generateSbom.groovy
def call(Map config) {
    sh """
        syft ${config.image} -o spdx-json=sbom-${config.name}.spdx.json
        archiveArtifacts artifacts: 'sbom-${config.name}.spdx.json', fingerprint: true
    """
}
```

Call it after Docker build and before push.

---

## 13.2 - Sign Images with Cosign

Use keyless signing if your CI identity supports it. For a simpler learning setup, store a Cosign key in Jenkins credentials.

```bash
cosign generate-key-pair
```

Never commit `cosign.key`. Store it in Jenkins credentials and sign after pushing:

```groovy
withCredentials([file(credentialsId: 'cosign-private-key', variable: 'COSIGN_KEY')]) {
    sh """
      cosign sign --key $COSIGN_KEY ${config.imageRef}
    """
}
```

Verification command:

```bash
cosign verify --key cosign.pub <account-id>.dkr.ecr.ap-south-1.amazonaws.com/diagramforge-backend:sha-<git-sha>
```

---

## 13.3 - Install Kyverno

```yaml
# gitops/apps/kyverno.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://kyverno.github.io/kyverno/
    chart: kyverno
    targetRevision: "3.1.4"
  destination:
    server: https://kubernetes.default.svc
    namespace: kyverno
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]
```

Start with audit mode. Move to enforce mode only after you understand what would be blocked.

Example policies:

- Require image tags not equal to `latest`
- Require resource requests and limits
- Require non-root containers
- Block privileged containers
- Require signed images from your ECR repositories

---

## 13.4 - IaC and Manifest Scanning in CI

Add a Jenkins stage for Terraform:

```bash
terraform fmt -check -recursive infrastructure
checkov -d infrastructure
```

Add a Jenkins stage for Helm:

```bash
helm lint charts/three-tier-app
helm template diagramforge charts/three-tier-app -f charts/three-tier-app/values-prod.yaml > rendered.yaml
kubeconform -strict -summary rendered.yaml
```

This catches broken YAML and unsafe cloud resources before ArgoCD or Terraform ever apply them.

---

## 13.5 - Dependency Pinning

Rules:

- Pin Docker base images to major versions at minimum.
- Prefer digest pinning for critical images.
- Keep `package-lock.json` committed.
- Keep `.terraform.lock.hcl` committed.
- Pin Helm chart versions in ArgoCD Applications.

This makes builds more reproducible and reduces surprise upgrades.

---

## Verification Checklist

- [ ] Jenkins archives SBOMs for frontend and backend images
- [ ] Images are signed after push to ECR
- [ ] Cosign verification succeeds for a deployed image
- [ ] Kyverno is installed and reporting policy results
- [ ] A pod using `latest` is rejected or flagged
- [ ] `checkov`, `terraform fmt`, `helm lint`, and `kubeconform` run in CI
- [ ] Pull requests show security failures before merge

---

## What's Next

Phase 14 adds progressive delivery: canary releases, metric analysis, automatic rollback, and safer production deployments.
