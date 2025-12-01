output "vpc_id" {
  value = module.networking.vpc_id
}

output "raw_data_bucket_name" {
  value = module.storage.raw_data_bucket_name
}

output "processing_queue_url" {
  value = module.storage.processing_queue_url
}

output "api_gateway_url" {
  value = module.compute.api_gateway_url
}



