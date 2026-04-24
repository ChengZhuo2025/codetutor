#!/usr/bin/env bash
set -Eeuo pipefail

PKG="${PKG:-${package_download_path:-/home/admin/app/package.tgz}}"
ROOT="${ROOT:-/var/www/code-tutor}"
REL="${REL:-$ROOT/releases}"
CUR="${CUR:-$ROOT/current}"
NAME="${NAME:-codetutor-web}"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-www.codetutor.cn}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
PNPM_VERSION="${PNPM_VERSION:-10.28.2}"
CURL_MAX_TIME="${CURL_MAX_TIME:-15}"

PREV_TARGET="$(readlink -f "$CUR" 2>/dev/null || true)"
NEW_DIR=""
SWITCHED=0

log() {
  echo "[DEPLOY] $*"
}

fail() {
  echo "[DEPLOY][ERROR] $*" >&2
  exit 1
}

check_http() {
  local url="$1"
  local expected="$2"
  local host_header="${3:-}"
  local code
  local location=""

  # Get status code
  if [ -n "$host_header" ]; then
    code="$(curl -sS -o /dev/null --max-time "$CURL_MAX_TIME" -H "$host_header" -w '%{http_code}' "$url" || true)"
    location="$(curl -sS -o /dev/null --max-time "$CURL_MAX_TIME" -H "$host_header" -w '%{redirect_url}' "$url" 2>/dev/null || true)"
  else
    code="$(curl -sS -o /dev/null --max-time "$CURL_MAX_TIME" -w '%{http_code}' "$url" || true)"
    location="$(curl -sS -o /dev/null --max-time "$CURL_MAX_TIME" -w '%{redirect_url}' "$url" 2>/dev/null || true)"
  fi

  if [ "$code" != "$expected" ]; then
    echo "[DEPLOY][DEBUG] Health check failed for $url" >&2
    echo "[DEPLOY][DEBUG]   Expected: $expected, Got: ${code:-curl_failed}" >&2
    if [ -n "$location" ] && [ "$location" != "null" ] && [ -n "$location" ]; then
      echo "[DEPLOY][DEBUG]   Redirects to: $location" >&2
    fi
    echo "[DEPLOY][DEBUG]   Tip: Check nginx config for HTTP->HTTPS or domain canonicalization redirects" >&2
    fail "health check failed: url=$url expected=$expected actual=${code:-curl_failed}"
  fi
}

rollback() {
  if [ "$SWITCHED" -ne 1 ] || [ -z "$PREV_TARGET" ] || [ ! -d "$PREV_TARGET" ]; then
    return 0
  fi

  log "rollback -> $PREV_TARGET"
  ln -sfn "$PREV_TARGET" "$CUR"

  pm2 delete "$NAME" >/dev/null 2>&1 || true
  pm2 start bash --name "$NAME" -- -lc "cd '$CUR' && export NODE_ENV=production PORT='$PORT' && exec pnpm start"
  sleep 3
  pm2 save >/dev/null 2>&1 || true
}

cleanup_failed_release() {
  if [ -n "$NEW_DIR" ] && [ -d "$NEW_DIR" ]; then
    if [ "$(readlink -f "$CUR" 2>/dev/null || true)" != "$NEW_DIR" ]; then
      rm -rf -- "$NEW_DIR"
    fi
  fi
}

on_error() {
  local exit_code=$?
  echo "[DEPLOY][ERROR] failed at line $1" >&2
  rollback || true
  cleanup_failed_release || true
  exit "$exit_code"
}

trap 'on_error $LINENO' ERR

[ -f "$PKG" ] || fail "package not found: $PKG"

mkdir -p "$REL"
NEW_DIR="$REL/$(date +%Y%m%d%H%M%S)"
mkdir -p "$NEW_DIR"

log "extract package -> $NEW_DIR"
tar -xzf "$PKG" -C "$NEW_DIR"

cd "$NEW_DIR"

command -v node >/dev/null || fail "node missing"
if ! command -v pnpm >/dev/null; then
  corepack enable
  corepack prepare "pnpm@$PNPM_VERSION" --activate
fi

log "pnpm install --frozen-lockfile"
if ! pnpm install --frozen-lockfile; then
  echo "[DEPLOY][ERROR] pnpm install failed."
  echo "[DEPLOY][HINT] Check pnpm-lock.yaml and package versions."
  exit 1
fi

log "pnpm build"
pnpm build

log "switch current -> $NEW_DIR"
ln -sfn "$NEW_DIR" "$CUR"
SWITCHED=1

if ! command -v pm2 >/dev/null; then
  npm i -g pm2
fi

log "restart pm2 app"
# Clean up both current and legacy process names to prevent duplicates during name migration
pm2 delete "$NAME" "code-tutor" "codetutor" >/dev/null 2>&1 || true
pm2 start bash --name "$NAME" -- -lc "cd '$CUR' && export NODE_ENV=production PORT='$PORT' && exec pnpm start"

log "wait for app"
sleep 3

log "health checks"
# Test direct to Node.js app (port $PORT)
check_http "http://127.0.0.1:$PORT/" 200
check_http "http://127.0.0.1:$PORT/admin/login" 200
check_http "http://127.0.0.1:$PORT/api/auth/session" 401
# Test with production domain header (may go through nginx proxy on port 80)
# If this fails with 301, it usually means nginx is doing HTTP->HTTPS or www redirect
check_http "http://127.0.0.1:$PORT/" 200 "Host: $DOMAIN"

pm2 save >/dev/null

log "cleanup old releases, keep latest $KEEP_RELEASES"
mapfile -t RELEASE_DIRS < <(find "$REL" -mindepth 1 -maxdepth 1 -type d | sort)
CURRENT_TARGET="$(readlink -f "$CUR")"
DELETE_COUNT=$(( ${#RELEASE_DIRS[@]} - KEEP_RELEASES ))

if [ "$DELETE_COUNT" -gt 0 ]; then
  for ((i=0; i<DELETE_COUNT; i++)); do
    dir="${RELEASE_DIRS[$i]}"
    if [ "$dir" = "$CURRENT_TARGET" ]; then
      continue
    fi
    log "remove old release: $dir"
    rm -rf -- "$dir"
  done
fi

log "ok"
log "current -> $CURRENT_TARGET"
