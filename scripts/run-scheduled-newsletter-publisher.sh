#!/usr/bin/env bash

set -euo pipefail

export TZ="${TZ:-Asia/Shanghai}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PUBLISH_SCRIPT="${REPO_ROOT}/scripts/publish-daily-newsletter.sh"
LOCK_DIR="${TMPDIR:-/tmp}/follow-builders-newsletter.lock"
LOOKBACK_DAYS="${PUBLISH_LOOKBACK_DAYS:-2}"
RETRY_ATTEMPTS="${PUBLISH_RETRY_ATTEMPTS:-2}"
RETRY_SLEEP_SECONDS="${PUBLISH_RETRY_SLEEP_SECONDS:-90}"
OPENCLAW_TIMEOUT_SECONDS="${OPENCLAW_TIMEOUT_SECONDS:-1800}"
ALLOW_GIT_PULL_FAILURE="${ALLOW_GIT_PULL_FAILURE:-1}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$*"
}

date_days_ago() {
  local offset="$1"
  if [[ "${offset}" == "0" ]]; then
    date +%Y-%m-%d
    return
  fi

  if date -v-"${offset}"d +%Y-%m-%d >/dev/null 2>&1; then
    date -v-"${offset}"d +%Y-%m-%d
    return
  fi

  date -d "${offset} days ago" +%Y-%m-%d
}

issue_json_path() {
  local publish_date="$1"
  printf '%s/data/issues/ai-builders-digest-%s.json' "${REPO_ROOT}" "${publish_date}"
}

issue_html_path() {
  local publish_date="$1"
  printf '%s/issues/ai-builders-digest-%s-rerun.html' "${REPO_ROOT}" "${publish_date}"
}

issue_exists() {
  local publish_date="$1"
  [[ -f "$(issue_json_path "${publish_date}")" && -f "$(issue_html_path "${publish_date}")" ]]
}

has_pending_push() {
  local ahead_count
  ahead_count="$(git -C "${REPO_ROOT}" rev-list --count origin/main..main 2>/dev/null || printf '0')"
  [[ "${ahead_count}" != "0" ]]
}

sync_pending_push() {
  if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
    log "SKIP_PUSH=1; leaving local commits unpushed."
    return 0
  fi

  if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
    if ! git -C "${REPO_ROOT}" pull --rebase origin main; then
      if [[ "${ALLOW_GIT_PULL_FAILURE}" == "1" ]]; then
        log "git pull failed while syncing pending commits; will still try to push current local main."
      else
        return 1
      fi
    fi
  fi

  git -C "${REPO_ROOT}" push origin main
}

emit_candidate_dates() {
  local raw_dates="${NEWSLETTER_DATES:-}"
  if [[ -n "${raw_dates}" ]]; then
    printf '%s\n' "${raw_dates}" | tr ', ' '\n\n' | awk 'NF { print $0 }'
    return
  fi

  local offset
  for ((offset=LOOKBACK_DAYS; offset>=0; offset--)); do
    date_days_ago "${offset}"
  done
}

publish_date() {
  local publish_date="$1"
  local attempt=1

  if issue_exists "${publish_date}"; then
    if has_pending_push; then
      log "Issue ${publish_date} exists and local commits are ahead; syncing pending push."
    else
      log "Issue ${publish_date} already exists; skipping."
      return 0
    fi
  fi

  while (( attempt <= RETRY_ATTEMPTS )); do
    if issue_exists "${publish_date}" && has_pending_push; then
      log "Syncing pending push for ${publish_date} (attempt ${attempt}/${RETRY_ATTEMPTS})..."
      if sync_pending_push; then
        log "Pushed pending commits for ${publish_date} successfully."
        return 0
      fi
    else
      log "Publishing ${publish_date} (attempt ${attempt}/${RETRY_ATTEMPTS})..."

      if NEWSLETTER_DATE="${publish_date}" \
        OPENCLAW_TIMEOUT_SECONDS="${OPENCLAW_TIMEOUT_SECONDS}" \
        ALLOW_GIT_PULL_FAILURE="${ALLOW_GIT_PULL_FAILURE}" \
        /bin/bash "${PUBLISH_SCRIPT}"; then
        if issue_exists "${publish_date}"; then
          log "Published ${publish_date} successfully."
          return 0
        fi

        log "Publish flow finished without both JSON and HTML for ${publish_date}."
      else
        local exit_code=$?
        log "Publish flow for ${publish_date} failed with exit code ${exit_code}."
      fi
    fi

    if (( attempt < RETRY_ATTEMPTS )); then
      log "Sleeping ${RETRY_SLEEP_SECONDS}s before retrying ${publish_date}."
      sleep "${RETRY_SLEEP_SECONDS}"
    fi

    attempt=$((attempt + 1))
  done

  return 1
}

main() {
  local failed=0

  if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
    log "Another scheduled publisher run is already active; skipping."
    exit 0
  fi
  trap 'rmdir "${LOCK_DIR}" >/dev/null 2>&1 || true' EXIT

  while IFS= read -r publish_date; do
    [[ -n "${publish_date}" ]] || continue

    if ! publish_date "${publish_date}"; then
      failed=1
    fi
  done < <(emit_candidate_dates)

  if (( failed )); then
    log "Scheduled publisher finished with at least one failed date."
    exit 1
  fi

  log "Scheduled publisher finished successfully."
}

main "$@"
