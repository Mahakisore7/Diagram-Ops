terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source              = "../modules/vpc"
  project_name        = var.project_name
  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24"]
  azs                 = ["${var.aws_region}a"]
}

module "security_group" {
  source       = "../modules/security-group"
  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id
  admin_ip     = var.admin_ip
}

module "iam_role" {
  source            = "../modules/iam-role"
  project_name      = var.project_name
  state_bucket_name = var.state_bucket_name
}

resource "aws_key_pair" "jenkins" {
  key_name   = "${var.project_name}-jenkins-key"
  public_key = file(var.ssh_public_key_path)
}

resource "aws_instance" "jenkins" {
  ami                    = var.jenkins_ami
  instance_type          = var.instance_type
  subnet_id              = module.vpc.public_subnet_ids[0]
  vpc_security_group_ids = [module.security_group.jenkins_sg_id]
  iam_instance_profile   = module.iam_role.instance_profile_name
  key_name               = aws_key_pair.jenkins.key_name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  # Forces IMDSv2 (session-token-based) instead of leaving IMDSv1 (plain
  # GET) available. Without this, any SSRF bug anywhere in code running on
  # this box — now or in a future phase — can fetch this instance's live
  # IAM credentials with a single unauthenticated GET request to
  # 169.254.169.254. This is the exact mechanism behind the 2019 Capital
  # One breach. http_tokens = "required" closes it at zero cost.
  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  user_data = file("${path.module}/user_data.sh")

  tags = { Name = "${var.project_name}-jenkins-server" }
}

# Without this, stopping and restarting the instance (the cost-saving habit
# recommended below) hands it a brand-new random public IP every time —
# silently breaking the GitHub webhook URL Phase 6 configures, any
# bookmarked Jenkins URL, and any DNS record pointed at it. An EIP keeps
# the address identical across every stop/start cycle. Note this isn't a
# money-saving move under current AWS pricing (public IPv4 addresses,
# EIP or not, cost the same small hourly rate since the Feb 2024 pricing
# change) — it's purely about the address staying stable.
resource "aws_eip" "jenkins" {
  instance = aws_instance.jenkins.id
  domain   = "vpc"
  tags     = { Name = "${var.project_name}-jenkins-eip" }
}
