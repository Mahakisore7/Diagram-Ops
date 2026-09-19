terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    tls = { source = "hashicorp/tls", version = "~> 4.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source              = "../modules/vpc"
  project_name        = "${var.project_name}-eks"
  vpc_cidr            = "10.1.0.0/16"
  public_subnet_cidrs = ["10.1.1.0/24", "10.1.2.0/24"]
  azs                 = ["${var.aws_region}a", "${var.aws_region}b"]
}

# --- EKS cluster IAM role ---
resource "aws_iam_role" "eks_cluster" {
  name = "${var.project_name}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# --- The cluster itself ---
resource "aws_eks_cluster" "this" {
  name     = "${var.project_name}-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = module.vpc.public_subnet_ids
    endpoint_public_access  = true
    endpoint_private_access = false
  }

  # EKS Access Entries (used below to grant Jenkins cluster access) only
  # work when the cluster's authentication mode includes "API" - it isn't
  # the default on the API this provider version targets, so it has to be
  # requested explicitly.
  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

# --- OIDC provider - the foundation of IRSA ---
data "tls_certificate" "eks" {
  url = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

# --- Node group IAM role ---
resource "aws_iam_role" "node_group" {
  name = "${var.project_name}-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_worker" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}
resource "aws_iam_role_policy_attachment" "node_cni" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}
resource "aws_iam_role_policy_attachment" "node_ecr" {
  role       = aws_iam_role.node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# --- Managed node group, spot instances for cost ---
resource "aws_eks_node_group" "this" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.project_name}-node-group"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = module.vpc.public_subnet_ids

  capacity_type  = "SPOT"
  instance_types = [var.node_instance_type]

  scaling_config {
    desired_size = var.desired_nodes
    min_size     = var.min_nodes
    max_size     = var.max_nodes
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]
}

# --- Grant Jenkins access via EKS Access Entries (modern, not the aws-auth hack) ---
resource "aws_eks_access_entry" "jenkins" {
  cluster_name  = aws_eks_cluster.this.name
  principal_arn = var.jenkins_role_arn
}

resource "aws_eks_access_policy_association" "jenkins_admin" {
  cluster_name  = aws_eks_cluster.this.name
  principal_arn = var.jenkins_role_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  # Both resources target the same principal but neither's arguments
  # reference the other, so Terraform has no automatic reason to order
  # them - without this, it creates them in parallel and the association
  # can reach EKS before the access entry it depends on actually exists.
  depends_on = [aws_eks_access_entry.jenkins]
}

# --- IRSA role for the AWS Load Balancer Controller ---
# The doc this phase is based on uses `eksctl create iamserviceaccount` for
# this step, which auto-creates the IAM role via a CloudFormation stack
# under an eksctl-generated name outside our diagramforge-* naming
# convention - on this account's locked-down IAM permissions that would
# mean yet another one-off permission grant for an unpredictable ARN.
# Creating it here instead, under our own name, reuses the iam:CreateRole
# grant already scoped to role/diagramforge-* from Phase 2.
locals {
  oidc_provider_host = replace(aws_iam_openid_connect_provider.eks.url, "https://", "")
}

resource "aws_iam_role" "lb_controller" {
  name = "${var.project_name}-lb-controller-role"

  # Trusts only this specific Kubernetes service account (kube-system/
  # aws-load-balancer-controller) via the cluster's OIDC provider - this is
  # what IRSA actually is: the pod's Kubernetes identity is exchanged for
  # temporary AWS credentials scoped to this role, no static keys involved.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.eks.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider_host}:aud" = "sts.amazonaws.com"
          "${local.oidc_provider_host}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }]
  })
}

resource "aws_iam_policy" "lb_controller" {
  name   = "${var.project_name}-lb-controller-policy"
  policy = file("${path.module}/lb-controller-iam-policy.json")
}

resource "aws_iam_role_policy_attachment" "lb_controller" {
  role       = aws_iam_role.lb_controller.name
  policy_arn = aws_iam_policy.lb_controller.arn
}
