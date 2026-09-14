variable "aws_region" { default = "ap-south-1" }
variable "project_name" { default = "diagramforge" }
variable "admin_ip" { type = string }
variable "jenkins_ami" { type = string }
variable "instance_type" { default = "m7i-flex.large" } # same 2 vCPU / 8GB RAM
# as t3.large (needed because Phase 3 adds SonarQube (JVM + Elasticsearch) to
# this same box, on top of Jenkins's own JVM and the memory Docker builds
# need — 4GB, e.g. t3.medium, is genuinely tight for that combination).
# m7i-flex.large specifically because it's Free-Tier-eligible on this
# account today, while t3.large is blocked by AWS's new-account Free-Tier-
# only restriction on RunInstances; switch back to t3.large once that
# restriction is lifted, if ever needed.
variable "ssh_public_key_path" { default = "~/.ssh/id_rsa.pub" }
variable "state_bucket_name" { type = string }
