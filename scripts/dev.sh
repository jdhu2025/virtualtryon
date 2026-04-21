#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
# Local dev defaults to 3000 to avoid macOS AirPlay on 5000. Override with PORT or DEPLOY_RUN_PORT.
DESIRED_PORT="${DEPLOY_RUN_PORT:-${PORT:-3000}}"

cd "${COZE_WORKSPACE_PATH}"

port_is_listening() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

cleanup_next_dev_lock() {
  local lock_file=".next/dev/lock"
  local pids

  if [[ ! -e "${lock_file}" ]]; then
    return 0
  fi

  pids=$(lsof -t "${lock_file}" 2>/dev/null | sort -u | tr '\n' ' ' | xargs echo 2>/dev/null || true)
  if [[ -n "${pids// /}" ]]; then
    echo "Found existing Next dev lock at ${lock_file}, held by PIDs: ${pids} (SIGKILL)"
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
    sleep 1
    pids=$(lsof -t "${lock_file}" 2>/dev/null | sort -u | tr '\n' ' ' | xargs echo 2>/dev/null || true)
    if [[ -n "${pids// /}" ]]; then
      echo "Warning: Next dev lock still held after SIGKILL, PIDs: ${pids}"
    fi
  fi

  if [[ -e "${lock_file}" ]]; then
    echo "Removing stale Next dev lock at ${lock_file}."
    rm -f "${lock_file}"
  fi
}

pick_dev_port() {
  local want="$1"
  local -a try=("${want}")
  case "${want}" in 3000) try+=(3001 5001) ;;
  5000) try+=(3000 3001 5001) ;;
  *) try+=(3001 5001) ;;
  esac
  local p
  for p in "${try[@]}"; do
    if ! port_is_listening "${p}"; then
      if [[ "${p}" != "${want}" ]]; then
        echo "Port ${want} in use; using ${p} for local dev." >&2
      fi
      echo "${p}"
      return 0
    fi
  done
  echo "No free dev port among: ${try[*]}. Set PORT to an available port." >&2
  return 1
}

kill_port_if_listening() {
  local port="$1"
  local pids
  pids=$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null | sort -u | tr '\n' ' ' | xargs echo 2>/dev/null || true)
  if [[ -z "${pids// /}" ]]; then
    echo "Port ${port} is free."
    return 0
  fi
  echo "Port ${port} in use by PIDs: ${pids} (SIGKILL)"
  # shellcheck disable=SC2086
  kill -9 ${pids} 2>/dev/null || true
  sleep 1
  pids=$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null | sort -u | tr '\n' ' ' | xargs echo 2>/dev/null || true)
  if [[ -n "${pids// /}" ]]; then
    echo "Warning: port ${port} still busy after SIGKILL, PIDs: ${pids}"
  else
    echo "Port ${port} cleared."
  fi
}

cleanup_next_dev_lock

PORT="$(pick_dev_port "${DESIRED_PORT}")"
export PORT

echo "Clearing port ${PORT} before start."
kill_port_if_listening "${PORT}"
echo "Starting HTTP service on port ${PORT} for dev..."

if [[ "${TSX_WATCH:-0}" == "1" ]]; then
  echo "Using tsx watch mode."
  PORT="${PORT}" pnpm tsx watch src/server.ts
else
  echo "Using Node + tsx loader mode. Set TSX_WATCH=1 to enable file watching."
  PORT="${PORT}" node --import tsx src/server.ts
fi
