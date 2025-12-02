output "raw_data_bucket_name" {
  value = aws_s3_bucket.raw_data.bucket
}

output "processing_queue_url" {
  value = aws_sqs_queue.processing.url
}

output "processing_queue_arn" {
  value = aws_sqs_queue.processing.arn
}

output "postgres_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "postgres_db_name" {
  value = aws_db_instance.postgres.db_name
}

output "postgres_username" {
  value = var.postgres_username
}

output "postgres_password" {
  value     = var.postgres_password != "" ? var.postgres_password : random_password.postgres.result
  sensitive = true
}

output "mongodb_connection_uri" {
  value     = var.mongodb_connection_uri != "" ? var.mongodb_connection_uri : "mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin"
  sensitive = false
}
