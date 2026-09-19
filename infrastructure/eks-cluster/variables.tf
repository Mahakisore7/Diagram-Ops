variable "aws_region" { default = "ap-south-1" }
variable "project_name" { default = "diagramforge" }
variable "kubernetes_version" { default = "1.29" }
variable "node_instance_type" { default = "t3.medium" }
variable "desired_nodes" { default = 2 }
variable "min_nodes" { default = 1 }
variable "max_nodes" { default = 3 }
variable "jenkins_role_arn" { type = string }
