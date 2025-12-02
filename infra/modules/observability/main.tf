resource "aws_cloudwatch_log_group" "ingestion" {
  name              = "/aws/lambda/${var.environment}-ingestion"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-ingestion-logs"
  }
}

resource "aws_cloudwatch_log_group" "processing" {
  name              = "/aws/lambda/${var.environment}-processing"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-processing-logs"
  }
}

resource "aws_cloudwatch_log_group" "reporting" {
  name              = "/aws/lambda/${var.environment}-reporting"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-reporting-logs"
  }
}

resource "aws_cloudwatch_metric_alarm" "ingestion_errors" {
  alarm_name          = "${var.environment}-ingestion-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This metric monitors ingestion lambda errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []

  dimensions = {
    FunctionName = "${var.environment}-ingestion"
  }

  tags = {
    Name = "${var.environment}-ingestion-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "processing_errors" {
  alarm_name          = "${var.environment}-processing-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This metric monitors processing lambda errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []

  dimensions = {
    FunctionName = "${var.environment}-processing"
  }

  tags = {
    Name = "${var.environment}-processing-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  alarm_name          = "${var.environment}-sqs-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "This metric monitors DLQ messages"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []

  dimensions = {
    QueueName = "${var.environment}-processing-dlq"
  }

  tags = {
    Name = "${var.environment}-sqs-dlq-alarm"
  }
}

resource "aws_sns_topic" "alerts" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${var.environment}-alerts"

  tags = {
    Name = "${var.environment}-alerts"
  }
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.environment == "prod" && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}
