variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  default     = ""
  sensitive   = true
}



