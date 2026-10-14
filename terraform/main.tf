# ==============================================================================
# INFRASTRUCTURE AS CODE (IaC) - MAIN CONFIGURATION
# Project: Automated Deployment of a Serverless Student Task Management Application
# Platform: Cloudflare Workers + Cloudflare Workers KV
# ==============================================================================

# 1. Provision Cloudflare Workers KV Namespace
# Stores persistent task records (Task ID, Title, Priority, Status, Created Date)
resource "cloudflare_workers_kv_namespace" "student_tasks" {
  account_id = var.cloudflare_account_id
  title      = var.kv_namespace_name
}

# 2. Provision and Deploy Serverless Cloudflare Worker
# Deploys application/worker.js with bindings to Workers KV and Environment variables
resource "cloudflare_workers_script" "student_task_worker" {
  account_id         = var.cloudflare_account_id
  script_name        = var.worker_name
  content            = file("${path.module}/../application/worker.js")
  compatibility_date = "2024-01-01"
  main_module        = "worker.js"

  bindings = [
    {
      type         = "kv_namespace"
      name         = "TASKS_KV"
      namespace_id = cloudflare_workers_kv_namespace.student_tasks.id
    },
    {
      type = "plain_text"
      name = "ENVIRONMENT"
      text = var.environment
    }
  ]
}

# 3. Expose Worker via workers.dev Subdomain Route
# Enables public HTTPS accessibility on the Cloudflare serverless edge
resource "cloudflare_workers_script_subdomain" "student_task_subdomain" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_workers_script.student_task_worker.script_name
  enabled     = true
}
