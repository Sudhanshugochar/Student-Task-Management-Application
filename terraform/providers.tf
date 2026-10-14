# Terraform Provider Configuration for Cloudflare
# Defines required provider and version constraints

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Provider credentials configured via variable or environment variable
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
