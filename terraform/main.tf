# Terraform configuration file

# Backend configuration for remote state storage
terraform {
  backend "http" {
    address        = "http://localhost:8787/api/v1/states/projectname/state.tfstate"
    lock_address   = "http://localhost:8787/api/v1/lock/projectname/state.tfstate"
    unlock_address = "http://localhost:8787/api/v1/lock/projectname/state.tfstate"
    username       = "admin"
    password       = "password"
  }
  
  # Required providers
  required_providers {
    http = {
      source = "hashicorp/http"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

# Random pet name resource
resource "random_pet" "server" {
}

# Output the generated pet name
output "pet" {
  value = random_pet.server.id
}

# Random password resource
resource "random_password" "server" {
  length = 19
}

# Output the generated password (marked as sensitive)
output "pwd" {
  value     = random_password.server.result
  sensitive = true
}

