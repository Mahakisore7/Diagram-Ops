variable "aws_region" {
  default = "ap-south-1"
}
variable "unique_suffix" {
  description = "Something globally unique — e.g. your AWS account ID"
  type        = string
}
