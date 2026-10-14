variable "project_name" { type = string }
variable "vpc_cidr" { type = string }
variable "public_subnet_cidrs" { type = list(string) }
variable "azs" { type = list(string) }

variable "public_subnet_tags" {
  description = "Extra tags for the public subnets (e.g. the ELB discovery tags EKS needs)"
  type        = map(string)
  default     = {}
}
