variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "postgres_username" {
  description = "PostgreSQL username"
  type        = string
  default     = "postgres"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "mongodb_username" {
  description = "MongoDB username"
  type        = string
  default     = "admin"
}

variable "mongodb_password" {
  description = "MongoDB password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "mongodb_connection_uri" {
  description = "MongoDB connection URI (for local dev or Atlas)"
  type        = string
  default     = ""
}
