resource "aws_iam_role" "ingestion_lambda" {
  name = "${var.environment}-ingestion-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-ingestion-lambda-role"
  }
}

resource "aws_iam_role_policy" "ingestion_lambda" {
  name = "${var.environment}-ingestion-lambda-policy"
  role = aws_iam_role.ingestion_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

resource "aws_iam_role" "processing_lambda" {
  name = "${var.environment}-processing-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-processing-lambda-role"
  }
}

resource "aws_iam_role_policy" "processing_lambda" {
  name = "${var.environment}-processing-lambda-policy"
  role = aws_iam_role.processing_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "reporting_lambda" {
  name = "${var.environment}-reporting-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-reporting-lambda-role"
  }
}

resource "aws_iam_role_policy" "reporting_lambda" {
  name = "${var.environment}-reporting-lambda-policy"
  role = aws_iam_role.reporting_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "ingestion" {
  filename      = "${path.module}/../../../../apps/ingestion/dist/main.zip"
  function_name = "${var.environment}-ingestion"
  role          = aws_iam_role.ingestion_lambda.arn
  handler       = "main.handler"
  runtime       = "nodejs18.x"
  timeout       = 300
  memory_size   = 512

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      S3_BUCKET_NAME = var.s3_bucket_name
      SQS_QUEUE_URL  = var.sqs_queue_url
      AWS_REGION     = "us-east-1"
    }
  }

  tags = {
    Name = "${var.environment}-ingestion"
  }
}

resource "aws_lambda_function" "processing" {
  filename                       = "${path.module}/../../../../apps/processing/dist/main.zip"
  function_name                  = "${var.environment}-processing"
  role                           = aws_iam_role.processing_lambda.arn
  handler                        = "main.handler"
  runtime                        = "nodejs18.x"
  timeout                        = 300
  memory_size                    = 512
  reserved_concurrent_executions = 10

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      S3_BUCKET_NAME     = var.s3_bucket_name
      SQS_QUEUE_URL      = var.sqs_queue_url
      MONGODB_URI        = var.mongodb_connection_uri
      MAX_CONCURRENCY    = "5"
      AWS_REGION         = "us-east-1"
    }
  }

  tags = {
    Name = "${var.environment}-processing"
  }
}

resource "aws_lambda_event_source_mapping" "processing" {
  event_source_arn                  = var.sqs_queue_arn
  function_name                     = aws_lambda_function.processing.arn
  batch_size                        = 10
  maximum_batching_window_in_seconds = 5
}

resource "aws_lambda_function" "reporting" {
  filename      = "${path.module}/../../../../apps/reporting-api/dist/main.zip"
  function_name = "${var.environment}-reporting"
  role          = aws_iam_role.reporting_lambda.arn
  handler       = "main.handler"
  runtime       = "nodejs18.x"
  timeout      = 30
  memory_size   = 512

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      POSTGRES_HOST     = var.postgres_endpoint
      POSTGRES_DB       = var.postgres_db_name
      POSTGRES_USER     = var.postgres_username
      MONGODB_URI       = var.mongodb_connection_uri
      JWT_SECRET        = var.jwt_secret
      AWS_REGION        = "us-east-1"
    }
  }

  tags = {
    Name = "${var.environment}-reporting"
  }
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.environment}-api"
  description = "TWL Pipeline API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${var.environment}-api"
  }
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.reporting.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reporting.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_method.proxy,
    aws_api_gateway_integration.lambda,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}
