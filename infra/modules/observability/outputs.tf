output "log_groups" {
  value = [
    aws_cloudwatch_log_group.ingestion.name,
    aws_cloudwatch_log_group.processing.name,
    aws_cloudwatch_log_group.reporting.name,
  ]
}



