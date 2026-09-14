variable "aws_region" { default = "ap-south-1" }
variable "project_name" { default = "diagramforge" }
variable "admin_ip" { type = string }
variable "jenkins_ami" { type = string }
variable "instance_type" { default = "t3.large" } # not t3.medium — Phase 3 adds
# SonarQube (JVM + Elasticsearch) to this same box, on top of Jenkins's own
# JVM plus the memory Docker builds need. 4GB (t3.medium) is genuinely
# tight for that combination; 8GB (t3.large) avoids a resize mid-course.
variable "ssh_public_key_path" { default = "~/.ssh/id_rsa.pub" }
variable "state_bucket_name" { type = string }
