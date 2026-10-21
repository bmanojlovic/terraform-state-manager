#!/usr/bin/env bash
# Self-contained real-terraform test: starts wrangler dev, runs the terraform
# lock/apply/unlock cycle against it, then tears everything down. Exits non-zero
# on any failure. Safe to run in CI or locally.
#
# Usage: ./ci-terraform-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8787}"
export BASE_URL="http://localhost:${PORT}"

# AUTH_TOKEN: prefer env, else read from .dev.vars
if [ -z "${AUTH_TOKEN:-}" ] && [ -f .dev.vars ]; then
  AUTH_TOKEN="$(grep -E '^AUTH_TOKEN=' .dev.vars | head -1 | cut -d= -f2-)"
fi
export AUTH_TOKEN="${AUTH_TOKEN:?AUTH_TOKEN not set and not found in .dev.vars}"

LOG="$(mktemp)"
DEV_PID=""
cleanup() {
  [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null || true
  pkill -f "wrangler dev" 2>/dev/null || true
  rm -f "$LOG"
}
trap cleanup EXIT

echo ">> Applying local D1 migrations"
npx wrangler d1 migrations apply tsm --local >/dev/null 2>&1 || true

echo ">> Starting wrangler dev on :${PORT}"
npx wrangler dev --local --port "$PORT" > "$LOG" 2>&1 &
DEV_PID=$!

echo ">> Waiting for tsm to come up"
up=""
for i in $(seq 1 60); do
  if curl -s "http://localhost:${PORT}" >/dev/null 2>&1; then up=1; break; fi
  # bail early if wrangler died
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "ERROR: wrangler dev exited early"; cat "$LOG"; exit 1
  fi
  sleep 1
done
[ -n "$up" ] || { echo "ERROR: tsm did not come up"; cat "$LOG"; exit 1; }

echo ">> Running real terraform cycle"
bash "$ROOT/test/terraform/run-terraform-test.sh"
