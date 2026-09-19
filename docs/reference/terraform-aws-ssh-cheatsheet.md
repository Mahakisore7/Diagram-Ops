# Terraform + AWS EC2 + SSH — General Reference

A project-agnostic cheat sheet for the Terraform/AWS/SSH workflow — reusable
on any future project, not just this one.

---

## 1. One-time machine setup

```bash
aws configure        # needs an IAM access key + secret (never root), and a default region
terraform -version    # confirm it's installed
```

Terraform never asks for AWS credentials itself — it always reuses whatever
`aws configure` already set up on your machine.

---

## 2. The core Terraform command loop

| Command | What it does |
|---|---|
| `terraform init` | Downloads the provider plugin (e.g. `hashicorp/aws`), sets up local tracking. Run once per folder, and again whenever you add a provider/module. |
| `terraform fmt` | Auto-formats your `.tf` files consistently. Run before every commit. |
| `terraform validate` | Checks `.tf` syntax is valid. Fast, but can't catch errors that only show up when AWS's real API is actually called. |
| `terraform plan` | Dry run — shows exactly what would be created/changed/destroyed. Touches nothing. Always read this before `apply`. |
| `terraform apply` | Actually calls AWS and creates/changes real resources. Prompts for `yes` unless you pass `-auto-approve`. |
| `terraform output` | Prints the values from your `output` blocks (e.g. a server's public IP) after `apply`. |
| `terraform state list` | Lists every resource Terraform is currently tracking. |
| `terraform state show <resource>` | Shows the full current details of one tracked resource. |
| `terraform apply -replace=<resource>` | Forces one specific resource to be destroyed and recreated (useful when something like `user_data` needs a fresh boot to actually take effect). |
| `terraform destroy` | Tears down everything Terraform created, in the right order. Always run this on learning/side projects once you're done, to stop paying for idle resources. |

---

## 3. Minimal file anatomy

```hcl
provider "aws" {
  region = "ap-south-1"
}

resource "aws_instance" "example" {
  ami           = "ami-xxxxxxxxxxxxx"
  instance_type = "t3.micro"
}

output "public_ip" {
  value = aws_instance.example.public_ip
}
```

- `provider` — which cloud, which region
- `resource` — the thing(s) you want to exist
- `variable` (optional) — inputs you fill in via `terraform.tfvars` (keep this file out of git if it holds anything sensitive)
- `output` — values you want printed back after `apply`

---

## 4. The general process, start to finish

1. Prereqs: `aws configure`, Terraform installed
2. Write your `.tf` file(s)
3. `terraform init`
4. `terraform plan` — read it
5. `terraform apply` — confirm with `yes`
6. Verify: check the AWS Console **in the correct region**, or via `aws` CLI
7. To change something: edit the `.tf` file, then `plan` + `apply` again — Terraform figures out the diff automatically
8. `terraform destroy` when you're done with it

---

## 5. After `apply` — SSH-ing into your new EC2 instance

You need three things, all of which come from your Terraform config:
- The instance's public IP (`terraform output`, or `aws ec2 describe-instances`)
- The private key matching the key pair Terraform registered (e.g. `~/.ssh/id_ed25519`)
- A security group that actually allows port 22 from your IP

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@<public-ip>       # Ubuntu AMIs
ssh -i ~/.ssh/id_ed25519 ec2-user@<public-ip>     # Amazon Linux AMIs
```

First connection ever to that IP will ask you to confirm a host key fingerprint — type `yes`.

**If the instance ever gets destroyed and recreated** (a `terraform apply` that replaces it) while keeping the same IP (e.g. via an Elastic IP), SSH will refuse to connect and warn "REMOTE HOST IDENTIFICATION HAS CHANGED" — this is expected, not an attack, since the new instance has a brand-new host key. Clear the stale one before reconnecting:

```bash
ssh-keygen -R <public-ip>
```

---

## 6. Installing software by hand once you're SSH'd in

This is the manual path — useful to know even if you later automate it (see §7).

```bash
sudo apt-get update -y && sudo apt-get upgrade -y

# Java (check the current minimum version required by whatever you're installing —
# this changes over time, e.g. Jenkins periodically raises its minimum JDK)
sudo apt-get install -y openjdk-21-jre

# Jenkins - fetch the CURRENT signing key filename, don't hardcode an old one
KEY_FILE=$(curl -fsSL https://pkg.jenkins.io/debian-stable/ | grep -oE '[a-zA-Z0-9._-]+\.key' | sort -u | tail -1)
curl -fsSL "https://pkg.jenkins.io/debian-stable/${KEY_FILE}" | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt-get update -y && sudo apt-get install -y jenkins

# Docker
sudo apt-get install -y docker.io
sudo usermod -aG docker jenkins

# Start everything
sudo systemctl enable --now docker
sudo systemctl enable --now jenkins

# First-time Jenkins unlock password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

---

## 7. Automating that install — `user_data` (the way we actually did it)

Instead of SSH-ing in and typing all of §6 by hand every time you create a server,
write those same commands into a shell script and hand it to AWS at launch time.
AWS runs it automatically, once, the very first time the instance boots — before
you ever connect to it.

```hcl
resource "aws_instance" "example" {
  ami           = "ami-xxxxxxxxxxxxx"
  instance_type = "t3.micro"
  user_data     = file("${path.module}/user_data.sh")

  # Without this, editing user_data.sh later just updates the stored
  # attribute on an already-running instance - it does NOT re-run the
  # script. This forces a real destroy+recreate whenever it changes.
  user_data_replace_on_change = true
}
```

---

## 8. Useful verification / debugging commands

| Command | What it tells you |
|---|---|
| `aws sts get-caller-identity` | Which AWS identity you're actually acting as right now |
| `aws ec2 describe-instances --instance-ids <id>` | Full details/state of one instance |
| `aws ec2 get-console-output --instance-id <id> --region <region>` | The instance's boot log — first place to check if `user_data` seems to have failed |
| `curl -s -o /dev/null -w "%{http_code}" http://<ip>:<port>` | Whether something is actually listening/responding on a port |
| `sudo systemctl status <service>` | Is a service running, and its last few log lines |
| `sudo journalctl -xeu <service> --no-pager \| tail -40` | Fuller failure logs for a systemd service |

---

## 9. Cost/hygiene habits worth keeping

```bash
aws ec2 stop-instances --instance-ids <id>    # stop paying for compute when not in use
aws ec2 start-instances --instance-ids <id>   # start it again later
```

An Elastic IP keeps the public IP identical across stop/start — without one,
you get a new random IP every time you start the instance again.

Always `terraform destroy` a learning/side project once you're done with it,
rather than leaving it running indefinitely.
