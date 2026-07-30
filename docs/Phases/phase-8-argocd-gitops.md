# Phase 8 — ArgoCD & Real GitOps
### App-of-Apps, Auto-Sync, Self-Heal, and Closing Phase 6's Pipeline

---

## Overview

Up to now, deployment has meant running `helm install` by hand. This phase installs ArgoCD and flips that around entirely: **Git becomes the single source of truth for what's deployed**, ArgoCD continuously watches it and reconciles the cluster to match, and Phase 6's Jenkins pipeline gets its final stage — updating the Helm values to point at a new image, then letting ArgoCD notice and deploy it, rather than Jenkins deploying anything directly.

**One necessary correction to Phase 7 first:** the Helm chart's `secret.yaml` templated a secret from a value passed at `helm install` time. That doesn't work once ArgoCD is doing the syncing — ArgoCD needs to reconcile *without* a human typing `--set secret=...` every time, and we don't want the real secret value sitting in Git even as an install-time parameter ArgoCD would need to store somewhere. The fix: create the secret **once, manually, directly in the cluster**, and have the Helm chart simply *reference* an existing secret rather than creating one. This is the honest, correct pattern until Phase 12's External Secrets Operator automates it properly.

```bash
kubectl create namespace diagramforge
kubectl create secret generic diagramforge-secrets \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY \
  -n diagramforge
```
Delete `templates/secret.yaml` from the chart — `backend-deployment.yaml`'s `secretKeyRef` already just references the secret by name, so nothing else needs to change.

## Architecture for this phase

```mermaid
graph TB
    Jenkins[Jenkins Pipeline<br/>Phase 6] -->|updates image tag,<br/>commits to git| GitRepo[GitHub: values-prod.yaml]
    GitRepo -->|watched continuously| ArgoCD[ArgoCD]
    RootApp[root-app.yaml<br/>App-of-Apps] -->|manages| ArgoCD
    ArgoCD -->|auto-sync + self-heal| EKS[EKS Cluster]
    Manual[Manual kubectl edit] -.drift.-> EKS
    ArgoCD -.detects drift, reverts.-> EKS
```

---

## Installing ArgoCD

```bash
kubectl create namespace argocd
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm install argocd argo/argo-cd -n argocd
```

**Access:** default to port-forward rather than another public ALB — you already have Jenkins and SonarQube both restricted to your IP; ArgoCD has real deploy power, and adding a third internet-facing admin surface isn't worth the convenience.
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

```bash
# Initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Login via CLI (install the argocd CLI first: brew/apt/direct download)
argocd login localhost:8080 --username admin --password <the-password> --insecure
```

---

## The App-of-Apps pattern

```
gitops/
├── root-app.yaml
└── apps/
    └── three-tier-app.yaml
    # monitoring.yaml joins this folder in Phase 9 — no new kubectl apply needed for it either
```

```yaml
# gitops/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/<you>/three-tier-devsecops-platform.git
    targetRevision: main
    path: gitops/apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
# gitops/apps/three-tier-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: three-tier-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/<you>/three-tier-devsecops-platform.git
    targetRevision: main
    path: charts/three-tier-app
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: diagramforge
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**Bootstrap with exactly one manual command, ever:**
```bash
kubectl apply -f gitops/root-app.yaml
```

After this single command, ArgoCD watches `gitops/apps/` continuously. Adding Phase 9's monitoring stack later means pushing a new YAML file to that folder — never another manual `kubectl apply`. That's the actual payoff of App-of-Apps: the root app manages child apps, so scaling to more components scales through Git commits, not through you remembering another imperative command.

**What `selfHeal: true` actually does, concretely:** if you (or a teammate, or an incident-response fumble) run `kubectl edit deployment ...` directly against the cluster, ArgoCD notices the live state no longer matches Git and **reverts it back** within seconds. This is the core GitOps principle made real — Git isn't documentation of what's deployed, it's the enforced definition of it.

---

## Completing Phase 6's pipeline

Add this final stage to both `Jenkinsfile.backend` and `Jenkinsfile.frontend`:

```groovy
stage('Update GitOps Manifest') {
    when { branch 'main' }
    steps {
        withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh """
                git config user.email "jenkins-ci@diagramforge.local"
                git config user.name "Jenkins CI"
                yq eval '.backend.image.tag = "sha-${env.GIT_SHA_SHORT}"' -i charts/three-tier-app/values-prod.yaml
                git add charts/three-tier-app/values-prod.yaml
                git commit -m "ci(gitops): deploy backend sha-${env.GIT_SHA_SHORT}"
                git push https://\${GIT_USER}:\${GIT_PASS}@github.com/<you>/three-tier-devsecops-platform.git main
            """
        }
    }
}
```
*(Use `.frontend.image.tag` in the frontend Jenkinsfile's equivalent stage.)*

Install `yq` on the Jenkins box first: `sudo snap install yq` or the direct binary download.

**An honest trade-off worth naming, not hiding:** this pushes straight to `main`, bypassing the PR review process Phase 0 set up for actual code changes. A stricter pattern has Jenkins push to a dedicated `gitops-deploy` branch that ArgoCD watches instead of `main`, keeping `main`'s branch protection meaningful for real code review while automated tag bumps flow through a separate path. We're using the simpler direct-push version here to keep this phase's scope contained — know that the branch-split version is the more rigorous production answer, and treat it as a genuine stretch goal once the core pipeline is solid end-to-end.

---

## Git practices for this phase

```bash
git checkout -b feat/phase-8-argocd-gitops

git add gitops
git commit -m "feat(gitops): add App-of-Apps root application and three-tier-app Application"

git rm charts/three-tier-app/templates/secret.yaml
git commit -m "fix(helm): remove templated secret creation — reference manually-created secret instead"

git add ci/jenkins/Jenkinsfile.backend ci/jenkins/Jenkinsfile.frontend
git commit -m "ci(gitops): add pipeline stage to bump image tag and trigger ArgoCD sync"

git push origin feat/phase-8-argocd-gitops
```

---

## Verification checklist

- [ ] `kubectl apply -f gitops/root-app.yaml` succeeds; ArgoCD UI shows `root-app` and `three-tier-app` both `Synced`/`Healthy`
- [ ] The manually-created secret exists in the `diagramforge` namespace and the backend pod starts successfully referencing it
- [ ] Push a real code change through the full pipeline: commit → Jenkins builds/scans/pushes to ECR → tag bump commit lands in `values-prod.yaml` → ArgoCD auto-syncs within its poll interval → `kubectl get pods` shows the new pod with the new image tag, with zero manual `kubectl` or `helm` commands from you
- [ ] Deliberately run `kubectl scale deployment ... --replicas=5` by hand, then watch ArgoCD revert it back to the Git-defined replica count — this is the concrete proof self-heal works, not just a config flag you trust blindly
- [ ] `argocd app history three-tier-app` shows a real deployment history tied to actual commits

---

## What's next

**Phase 9** adds Prometheus and Grafana via Helm, joining the App-of-Apps pattern exactly like `three-tier-app` did — plus real dashboards and alerting rules, not just "monitoring exists" as a checkbox.

Say **Continue** for Phase 9.
