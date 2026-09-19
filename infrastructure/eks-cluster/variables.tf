variable "aws_region" { default = "ap-south-1" }
variable "project_name" { default = "diagramforge" }
variable "kubernetes_version" { default = "1.34" }
# t3.medium isn't Free-Tier-eligible on this account (see the same
# restriction hit for the Jenkins EC2 instance in Phase 2) - m7i-flex.large
# is the eligible equivalent with comparable specs (2 vCPU / 8GB RAM).
variable "node_instance_type" { default = "m7i-flex.large" }
variable "desired_nodes" { default = 2 }
variable "min_nodes" { default = 1 }
variable "max_nodes" { default = 3 }
variable "jenkins_role_arn" { type = string }
