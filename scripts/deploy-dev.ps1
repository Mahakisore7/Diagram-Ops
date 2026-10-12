# Deploys the three-tier-app chart to the current kubectl context (the dev EKS
# cluster). Secrets are read from application/.env and written to a temp
# values file that is deleted straight after; nothing is printed or committed.
#
# Usage (from the repo root, with kubectl pointed at the cluster):
#   ./scripts/deploy-dev.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$region = 'ap-south-1'

# --- registry and the newest image tag in each ECR repo ---
$account = (aws sts get-caller-identity --query Account --output text).Trim()
$registry = "$account.dkr.ecr.$region.amazonaws.com"
function Get-LatestTag($repo) {
  $tag = aws ecr describe-images --region $region --repository-name $repo `
    --query "sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]" --output text
  if (-not $tag -or $tag -eq 'None') { throw "No image found in ECR repo $repo" }
  return $tag.Trim()
}
$frontendTag = Get-LatestTag 'diagramforge-frontend'
$backendTag = Get-LatestTag 'diagramforge-backend'
Write-Host "registry=$registry frontend=$frontendTag backend=$backendTag"

# --- secrets from application/.env (values never echoed) ---
$envFile = Join-Path $root 'application/.env'
$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
foreach ($k in 'JWT_SECRET', 'GROQ_API_KEY', 'ANTHROPIC_API_KEY') {
  if (-not $vars[$k]) { throw "$k is missing or empty in application/.env" }
}

$tmp = New-TemporaryFile
try {
  @"
secrets:
  jwtSecret: "$($vars['JWT_SECRET'])"
  groqApiKey: "$($vars['GROQ_API_KEY'])"
  anthropicApiKey: "$($vars['ANTHROPIC_API_KEY'])"
"@ | Set-Content -Path $tmp -Encoding utf8

  helm upgrade --install diagramforge (Join-Path $root 'charts/three-tier-app') `
    -f (Join-Path $root 'charts/three-tier-app/values-dev.yaml') `
    -f $tmp `
    --set global.registry=$registry `
    --set frontend.image.tag=$frontendTag `
    --set backend.image.tag=$backendTag `
    --wait --timeout 10m
}
finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host "`nPods:"
kubectl get pods
Write-Host "`nIngress (the ALB address appears after a minute or two):"
kubectl get ingress
