terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "twl-pipeline-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "twl-pipeline-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "dev"
      Project     = "twl-pipeline"
      ManagedBy   = "terraform"
    }
  }
}

module "networking" {
  source = "../../modules/networking"

  environment = "dev"
  vpc_cidr    = "10.0.0.0/16"
}

module "storage" {
  source = "../../modules/storage"

  environment        = "dev"
  vpc_id             = module.networking.vpc_id
  vpc_cidr           = "10.0.0.0/16"
  private_subnet_ids = module.networking.private_subnet_ids
  mongodb_connection_uri = "mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin"
}

module "compute" {
  source = "../../modules/compute"

  environment            = "dev"
  vpc_id                 = module.networking.vpc_id
  private_subnet_ids     = module.networking.private_subnet_ids
  public_subnet_ids      = module.networking.public_subnet_ids
  lambda_security_group_id = module.networking.lambda_security_group_id
  s3_bucket_name         = module.storage.raw_data_bucket_name
  sqs_queue_url          = module.storage.processing_queue_url
  sqs_queue_arn          = module.storage.processing_queue_arn
  mongodb_connection_uri = module.storage.mongodb_connection_uri
  postgres_endpoint      = module.storage.postgres_endpoint
  postgres_db_name       = module.storage.postgres_db_name
  postgres_username      = module.storage.postgres_username
  postgres_password      = module.storage.postgres_password
  jwt_secret             = var.jwt_secret
}

module "observability" {
  source = "../../modules/observability"

  environment = "dev"
  vpc_id      = module.networking.vpc_id
}

