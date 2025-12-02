variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "lambda_security_group_id" {
  description = "Lambda security group ID"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name for raw data"
  type        = string
}

variable "sqs_queue_url" {
  description = "SQS queue URL"
  type        = string
}

variable "sqs_queue_arn" {
  description = "SQS queue ARN"
  type        = string
}

variable "mongodb_connection_uri" {
  description = "MongoDB connection URI"
  type        = string
  sensitive   = true
}

variable "postgres_endpoint" {
  description = "PostgreSQL endpoint"
  type        = string
}

variable "postgres_db_name" {
  description = "PostgreSQL database name"
  type        = string
}

variable "postgres_username" {
  description = "PostgreSQL username"
  type        = string
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret"
  type        = string
  sensitive   = true
  default     = ""
}

