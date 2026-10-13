#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

cleanup() {
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${ADMIN_PID:-}" ]] && kill "$ADMIN_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

pnpm --filter xtravel84-api dev &
API_PID=$!
pnpm --filter @xtravel84/admin dev &
ADMIN_PID=$!

wait -n "$API_PID" "$ADMIN_PID"
