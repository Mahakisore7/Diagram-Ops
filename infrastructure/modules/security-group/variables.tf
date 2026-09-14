variable "project_name" { type = string }
variable "vpc_id" { type = string }
variable "admin_ip" {
  type        = string
  description = "Your public IP in CIDR form, e.g. 49.207.x.x/32"
}
