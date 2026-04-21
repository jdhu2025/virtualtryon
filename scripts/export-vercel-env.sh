#!/bin/bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_FILE="${1:-$ROOT_DIR/.env.vercel.import.local}"
MERGED_ENV_FILE="$(mktemp)"

trap 'rm -f "$MERGED_ENV_FILE"' EXIT

load_env_file() {
  local file="$1"

  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      ""|\#*) continue
        ;;
    esac

    [[ "$line" == *=* ]] || continue

    local key="${line%%=*}"

    [[ "$key" =~ ^[A-Z0-9_]+$ ]] || continue
    printf '%s\n' "$line" >> "$MERGED_ENV_FILE"
  done < "$file"
}

should_skip_for_vercel_import() {
  case "$1" in
    HOSTNAME|NODE_ENV|PORT|VERCEL|COZE_WORKSPACE_PATH|DEPLOY_RUN_PORT|COZE_PROJECT_ENV)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

load_env_file "$ROOT_DIR/.env_副本.local"
load_env_file "$ROOT_DIR/.env.local"

USED_KEYS=()
while IFS= read -r key; do
  [[ -n "$key" ]] || continue
  USED_KEYS+=("$key")
done < <(
  {
    rg -o --no-filename 'process\.env\.([A-Z0-9_]+)' "$ROOT_DIR/src" \
      | sed 's/.*process\.env\.//'
    printf '%s\n' \
      COZE_WORKSPACE_PATH \
      DEPLOY_RUN_PORT \
      COZE_PROJECT_ENV \
      HOSTNAME \
      NODE_ENV \
      PORT \
      VERCEL
  } | sort -u
)

INCLUDED_KEYS=()
MISSING_KEYS=()
SKIPPED_KEYS=()

for key in "${USED_KEYS[@]}"; do
  if should_skip_for_vercel_import "$key"; then
    SKIPPED_KEYS+=("$key")
    continue
  fi

  value_line="$(grep "^${key}=" "$MERGED_ENV_FILE" | tail -n 1 || true)"
  value="${value_line#*=}"

  if [[ -n "$value_line" && -n "$value" ]]; then
    INCLUDED_KEYS+=("$key")
  else
    MISSING_KEYS+=("$key")
  fi
done

mkdir -p "$(dirname "$OUTPUT_FILE")"
: > "$OUTPUT_FILE"

for key in "${INCLUDED_KEYS[@]}"; do
  grep "^${key}=" "$MERGED_ENV_FILE" | tail -n 1 >> "$OUTPUT_FILE"
done

chmod 600 "$OUTPUT_FILE"

echo "Wrote ${#INCLUDED_KEYS[@]} variables to $OUTPUT_FILE"

if [[ ${#SKIPPED_KEYS[@]} -gt 0 ]]; then
  echo "Skipped platform/local-only keys:"
  printf '  - %s\n' "${SKIPPED_KEYS[@]}"
fi

if [[ ${#MISSING_KEYS[@]} -gt 0 ]]; then
  echo "Not exported because no value was found locally:"
  printf '  - %s\n' "${MISSING_KEYS[@]}"
fi
