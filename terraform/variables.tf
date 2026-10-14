# Input Variables for Cloudflare Serverless Student Task Manager

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token with Workers Scripts, KV, and Account settings permissions"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID (obtainable from Cloudflare Dashboard URL or Overview page)"
}

variable "worker_name" {
  type        = string
  description = "Name of the Cloudflare Worker script and service"
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  type        = string
  description = "Title of the Cloudflare Workers KV namespace for task storage"
  default     = "student_tasks"
}

variable "environment" {
  type        = string
  description = "Application deployment environment (production, staging, dev)"
  default     = "production"
}
