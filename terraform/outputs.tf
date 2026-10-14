# Terraform Outputs
# Exposes critical infrastructure details after successful provisioning

output "worker_name" {
  description = "Name of the deployed Cloudflare Worker"
  value       = cloudflare_workers_script.student_task_worker.script_name
}

output "kv_namespace_id" {
  description = "Unique Identifier of the provisioned Workers KV Namespace"
  value       = cloudflare_workers_kv_namespace.student_tasks.id
}

output "kv_namespace_title" {
  description = "Title of the provisioned Workers KV Namespace"
  value       = cloudflare_workers_kv_namespace.student_tasks.title
}

output "environment" {
  description = "Application deployment environment"
  value       = var.environment
}

output "application_url" {
  description = "Public HTTPS Worker URL format (subdomain configured in Cloudflare Dashboard)"
  value       = "https://${cloudflare_workers_script.student_task_worker.script_name}.workers.dev"
}
