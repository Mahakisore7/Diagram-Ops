# Removes everything that costs money in the dev environment, in the order
# that avoids orphaned resources: the Helm release first (this deletes the
# ALB the Ingress created, which would otherwise block deleting the VPC),
# then the EKS cluster and its network via Terraform.
#
# ECR repositories, the Terraform state bucket and the Jenkins server's disk
# are left alone (they cost cents). Stop the Jenkins instance separately.
#
# Usage (from the repo root):
#   ./scripts/teardown-dev.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host 'Uninstalling the app (deletes the ALB and the MongoDB volume)...'
helm uninstall diagramforge 2>$null
kubectl delete pvc --all 2>$null
Write-Host 'Waiting 90s for AWS to finish deleting the load balancer and volume...'
Start-Sleep -Seconds 90

Write-Host 'Uninstalling the load balancer controller...'
helm uninstall aws-load-balancer-controller -n kube-system 2>$null

Write-Host 'Destroying the EKS cluster, nodes and network with Terraform...'
Push-Location (Join-Path $root 'infrastructure/eks-cluster')
try {
  terraform destroy -auto-approve
}
finally {
  Pop-Location
}
Write-Host 'Done. Check the AWS console (EC2 > Load Balancers, Volumes) shows nothing left.'
