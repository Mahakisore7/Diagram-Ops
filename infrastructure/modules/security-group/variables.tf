variable "project_name" { type = string }
variable "vpc_id" { type = string }
variable "admin_ip" {
  type        = string
  description = "Your public IP in CIDR form, e.g. 49.207.x.x/32"
}

variable "github_webhook_ranges" {
  type        = list(string)
  description = "GitHub's published webhook source IP ranges (IPv4). Source of truth: https://api.github.com/meta -> .hooks"
  default = [
    "192.30.252.0/22",
    "185.199.108.0/22",
    "140.82.112.0/20",
    "143.55.64.0/20",
  ]
}
