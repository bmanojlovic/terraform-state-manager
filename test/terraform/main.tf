# Real-terraform integration fixture for tsm.
#
# Exercises the full backend contract against a local `wrangler dev`:
#   - lock acquire/release (bug 2: stale-lock TTL)
#   - state GET/POST streaming (bug 1: large-body 503s)
#   - the /unlock/ alias path (bug 3: 404 on unlock_address)
#
# Auth: the HTTP backend sends username/password as Basic auth. tsm maps the
# admin bearer token via the TSM_* / backend credentials configured by the
# runner script (see run-terraform-test.sh), which injects the address and
# token at init time with -backend-config so this file stays static.

terraform {
  backend "http" {}

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Trivial resources: enough to produce real state writes/reads without needing
# any cloud credentials.
resource "random_pet" "server" {
  length = 2
}

resource "random_password" "server" {
  length = 19
}

output "pet" {
  value = random_pet.server.id
}

output "pwd" {
  value     = random_password.server.result
  sensitive = true
}
