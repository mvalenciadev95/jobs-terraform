resource "aws_s3_bucket" "raw_data" {
  bucket = "${var.environment}-twl-raw-data-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "${var.environment}-raw-data"
  }
}

resource "aws_s3_bucket_versioning" "raw_data" {
  bucket = aws_s3_bucket.raw_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_data" {
  bucket = aws_s3_bucket.raw_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "raw_data" {
  bucket = aws_s3_bucket.raw_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_sqs_queue" "processing" {
  name                      = "${var.environment}-processing-queue"
  message_retention_seconds = 345600
  visibility_timeout_seconds = 300

  tags = {
    Name = "${var.environment}-processing-queue"
  }
}

resource "aws_sqs_queue" "dlq" {
  name = "${var.environment}-processing-dlq"

  tags = {
    Name = "${var.environment}-processing-dlq"
  }
}

resource "aws_sqs_queue_redrive_policy" "processing" {
  queue_url = aws_sqs_queue.processing.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_db_instance" "postgres" {
  identifier             = "${var.environment}-postgres"
  engine                 = "postgres"
  engine_version         = "14.9"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_encrypted       = true
  db_name                = "twl_pipeline"
  username               = var.postgres_username
  password               = var.postgres_password
  vpc_security_group_ids = [aws_security_group.postgres.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  skip_final_snapshot    = var.environment == "dev"
  backup_retention_period = var.environment == "prod" ? 7 : 1

  tags = {
    Name = "${var.environment}-postgres"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.environment}-db-subnet-group"
  }
}

resource "aws_security_group" "postgres" {
  name        = "${var.environment}-postgres-sg"
  description = "Security group for PostgreSQL RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-postgres-sg"
  }
}

resource "aws_docdb_cluster" "mongodb" {
  count = 0
  cluster_identifier      = "${var.environment}-mongodb"
  engine                  = "docdb"
  master_username         = var.mongodb_username
  master_password         = var.mongodb_password
  db_subnet_group_name    = aws_docdb_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.mongodb.id]
  skip_final_snapshot     = var.environment == "dev"
  backup_retention_period  = var.environment == "prod" ? 7 : 1
  storage_encrypted       = true

  tags = {
    Name = "${var.environment}-mongodb"
  }
}

resource "aws_docdb_cluster_instance" "mongodb" {
  count              = 0
  identifier         = "${var.environment}-mongodb-${count.index}"
  cluster_identifier = aws_docdb_cluster.mongodb[0].id
  instance_class     = "db.t3.medium"
}

resource "aws_docdb_subnet_group" "main" {
  name       = "${var.environment}-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.environment}-docdb-subnet-group"
  }
}

resource "aws_security_group" "mongodb" {
  name        = "${var.environment}-mongodb-sg"
  description = "Security group for MongoDB DocumentDB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-mongodb-sg"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "random_password" "postgres" {
  length  = 16
  special = true
}

resource "random_password" "mongodb" {
  length  = 16
  special = true
}

resource "aws_secretsmanager_secret" "postgres" {
  name = "${var.environment}-postgres-credentials"

  tags = {
    Name = "${var.environment}-postgres-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "postgres" {
  secret_id = aws_secretsmanager_secret.postgres.id
  secret_string = jsonencode({
    username = var.postgres_username
    password = var.postgres_password
    endpoint = aws_db_instance.postgres.endpoint
    port     = aws_db_instance.postgres.port
    database = aws_db_instance.postgres.db_name
  })
}

resource "aws_secretsmanager_secret" "mongodb" {
  count = 0
  name  = "${var.environment}-mongodb-credentials"

  tags = {
    Name = "${var.environment}-mongodb-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "mongodb" {
  count        = 0
  secret_id    = aws_secretsmanager_secret.mongodb[0].id
  secret_string = jsonencode({
    username = var.mongodb_username
    password = var.mongodb_password
    endpoint = aws_docdb_cluster.mongodb[0].endpoint
    port     = aws_docdb_cluster.mongodb[0].port
  })
}
