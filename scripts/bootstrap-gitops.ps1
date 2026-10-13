# Bootstraps GitOps on the current kubectl context (the EKS cluster):
# installs ArgoCD,
# creates the two out-of-band Secrets, and applies the single root Application.
# Everything else (the app, monitoring, ...) then arrives through Git.
#
# Secret values come from application/.env and are piped straight into kubectl;
# nothing is printed or written to disk. The Grafana password is generated.
#
# Usage (repo root, kubectl pointed at the cluster, storage class applied):
#   ./scripts/bootstrap-gitops.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$vars = @{}
Get-Content (Join-Path $root 'application/.env') | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
foreach ($k in 'JWT_SECRET', 'GROQ_API_KEY', 'ANTHROPIC_API_KEY') {
  if (-not $vars[$k]) { throw "$k is missing or empty in application/.env" }
}

kubectl apply -f (Join-Path $root 'infrastructure/eks-cluster/storageclass-gp3.yaml')

helm repo add argo https://argoproj.github.io/argo-helm 2>$null
helm repo update
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install argocd argo/argo-cd -n argocd --wait --timeout 10m

foreach ($ns in 'diagramforge', 'monitoring') {
  kubectl create namespace $ns --dry-run=client -o yaml | kubectl apply -f -
}

kubectl create secret generic diagramforge-secrets -n diagramforge `
  --from-literal=jwt-secret=$($vars['JWT_SECRET']) `
  --from-literal=groq-api-key=$($vars['GROQ_API_KEY']) `
  --from-literal=anthropic-api-key=$($vars['ANTHROPIC_API_KEY']) `
  --dry-run=client -o yaml | kubectl apply -f -

$grafanaPw = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
kubectl create secret generic grafana-admin -n monitoring `
  --from-literal=admin-user=admin `
  --from-literal=admin-password=$grafanaPw `
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f (Join-Path $root 'gitops/root-app.yaml')

Write-Host "`nArgoCD admin password:  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}'  (base64)"
Write-Host "Grafana admin password: kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}'  (base64)"
Write-Host "UIs (never public):     kubectl port-forward svc/argocd-server -n argocd 8080:443"
Write-Host "                        kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80"
Write-Host "Watch the sync:         kubectl get applications -n argocd -w"
