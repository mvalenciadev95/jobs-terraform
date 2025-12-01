output "api_gateway_url" {
  value = "${aws_api_gateway_deployment.main.invoke_url}"
}

output "ingestion_lambda_arn" {
  value = aws_lambda_function.ingestion.arn
}

output "processing_lambda_arn" {
  value = aws_lambda_function.processing.arn
}

output "reporting_lambda_arn" {
  value = aws_lambda_function.reporting.arn
}



