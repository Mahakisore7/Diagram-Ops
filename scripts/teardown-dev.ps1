# Removes everything that costs money in the dev environment, in the order
# that avoids orphaned resources: ArgoCD's applications first (otherwise
# self-heal recreates whatever is deleted), then the namespaces (this deletes
# the ALB the Ingress created and the EBS volumes, either of which would block
# deleting the VPC), then the EKS cluster and its network via Terraform.
#
# ECR repositories, the Terraform state bucket and the Jenkins server's disk
# are left alone (they cost cents). Stop the Jenkins instance separately.
#
# Usage (from the repo root):
#   ./scripts/teardown-dev.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot

Write-Host 'Stopping GitOps reconciliation (root app first, so children are not recreated)...'
kubectl delete application root-app -n argocd --wait=false 2>$null
kubectl delete application three-tier-app monitoring metrics-server -n argocd --wait=false 2>$null

Write-Host 'Removing the app and monitoring (deletes the ALB and the EBS volumes)...'
helm uninstall diagramforge 2>$null   # present only after scripts/deploy-dev.ps1
kubectl delete ingress --all -n diagramforge 2>$null
kubectl delete namespace diagramforge monitoring --timeout=180s 2>$null

Write-Host 'Waiting for the load balancer to disappear...'
for ($i = 0; $i -lt 30; $i++) {
  $lbs = aws elbv2 describe-load-balancers --region ap-south-1 --query 'LoadBalancers[?contains(LoadBalancerName,`k8s-`)].LoadBalancerName' --output text
  if (-not $lbs) { break }
  Start-Sleep -Seconds 10
}

Write-Host 'Uninstalling ArgoCD and the load balancer controller...'
helm uninstall argocd -n argocd 2>$null
helm uninstall aws-load-balancer-controller -n kube-system 2>$null
Start-Sleep -Seconds 30

Write-Host 'Destroying the EKS cluster, nodes and network with Terraform...'
Push-Location (Join-Path $root 'infrastructure/eks-cluster')
try {
  terraform destroy -auto-approve
}
finally {
  Pop-Location
}
Write-Host 'Done. Check the AWS console (EC2 > Load Balancers, Volumes) shows nothing left.'
