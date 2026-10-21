#!/usr/bin/env bash
# Real-terraform end-to-end test against a running tsm instance.
#
# Drives an actual `terraform` binary through init -> apply -> apply(no-op) ->
# destroy using tsm as the HTTP backend. This is the only test that exercises
# the real backend contract terraform depends on:
#   - lock acquire on apply, release on completion (bug 2)
#   - state POST (write) and GET (read) streaming (bug 1)
#   - the /unlock/ alias path as unlock_address (bug 3)
#
# Usage:
#   BASE_URL=http://localhost:8787 AUTH_TOKEN=xxx ./run-terraform-test.sh
#
# Requires: terraform (or tofu) on PATH, and a reachable tsm at BASE_URL.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8787}"
AUTH_TOKEN="${AUTH_TOKEN:?AUTH_TOKEN must be set}"
PROJECT="tftest"
STATE_PATH="state.tfstate"
TF_USER="tftest-user"
TF_PASS="tftest-pass-123"

# terraform or tofu
TF_BIN="$(command -v terraform || command -v tofu || true)"
if [ -z "$TF_BIN" ]; then
  echo "ERROR: neither terraform nor tofu found on PATH" >&2
  exit 1
fi
echo ">> Using $TF_BIN ($($TF_BIN version | head -1))"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$(mktemp -d)"
cp "$SCRIPT_DIR/main.tf" "$WORK_DIR/"
cd "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

auth_bearer=(-H "Authorization: Bearer ${AUTH_TOKEN}")

echo ">> Seeding admin + test user"
# Initialize admin (idempotent-ish; ignore if already present)
curl -fsS -X POST "${BASE_URL}/config/init" "${auth_bearer[@]}" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' >/dev/null 2>&1 || true

# Create the project user terraform will authenticate as (Basic auth).
curl -fsS -X POST "${BASE_URL}/api/v1/users" "${auth_bearer[@]}" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${TF_USER}\",\"password\":\"${TF_PASS}\",\"project\":\"${PROJECT}\",\"role\":\"developer\"}" \
  >/dev/null 2>&1 || true

# Clear any leftover lock/state from a previous run so the test is repeatable.
curl -fsS -X DELETE "${BASE_URL}/api/v1/lock/${PROJECT}/${STATE_PATH}" \
  -u "${TF_USER}:${TF_PASS}" -H 'Content-Type: application/json' -d '{}' >/dev/null 2>&1 || true
curl -fsS -X DELETE "${BASE_URL}/api/v1/states/${PROJECT}/${STATE_PATH}" \
  -u "${TF_USER}:${TF_PASS}" >/dev/null 2>&1 || true

ADDR="${BASE_URL}/api/v1/states/${PROJECT}/${STATE_PATH}"
LOCK_ADDR="${BASE_URL}/api/v1/lock/${PROJECT}/${STATE_PATH}"
# Deliberately use the /unlock/ ALIAS path to prove bug 3 is fixed end-to-end.
UNLOCK_ADDR="${BASE_URL}/api/v1/unlock/${PROJECT}/${STATE_PATH}"

backend_config=(
  -backend-config="address=${ADDR}"
  -backend-config="lock_address=${LOCK_ADDR}"
  -backend-config="unlock_address=${UNLOCK_ADDR}"
  -backend-config="lock_method=POST"
  -backend-config="unlock_method=POST"
  -backend-config="username=${TF_USER}"
  -backend-config="password=${TF_PASS}"
)

echo ">> terraform init"
"$TF_BIN" init -input=false "${backend_config[@]}"

echo ">> terraform apply (acquires lock, writes state via /unlock/ for release)"
"$TF_BIN" apply -input=false -auto-approve

echo ">> terraform apply again (no-op; proves state GET round-trips)"
out="$("$TF_BIN" apply -input=false -auto-approve 2>&1)"
echo "$out" | grep -qE "No changes|0 added, 0 changed, 0 destroyed" \
  && echo "   OK: second apply is a no-op" \
  || { echo "   FAIL: expected no-op on second apply"; echo "$out"; exit 1; }

echo ">> Verify outputs are readable from state"
"$TF_BIN" output -raw pet >/dev/null && echo "   OK: 'pet' output read from state"

echo ">> terraform destroy"
"$TF_BIN" destroy -input=false -auto-approve

echo ">> Verify lock was released (GET lock should report locked:false)"
lock_status="$(curl -fsS "${LOCK_ADDR}" -u "${TF_USER}:${TF_PASS}")"
echo "$lock_status" | grep -q '"locked":false' \
  && echo "   OK: lock released cleanly" \
  || { echo "   FAIL: lock not released: $lock_status"; exit 1; }

echo ">> PASS: real terraform lock/apply/unlock cycle succeeded"
