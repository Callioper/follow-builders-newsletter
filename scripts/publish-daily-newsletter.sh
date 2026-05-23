#!/usr/bin/env bash

set -euo pipefail

export TZ="${TZ:-Asia/Shanghai}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATE="${NEWSLETTER_DATE:-$(date +%Y-%m-%d)}"
DATA_ISSUES_DIR="${REPO_ROOT}/data/issues"
JSON_PATH="${DATA_ISSUES_DIR}/ai-builders-digest-${DATE}.json"
ISSUES_DIR="${REPO_ROOT}/issues"
HTML_PATH="${ISSUES_DIR}/ai-builders-digest-${DATE}-rerun.html"
INDEX_PATH="${REPO_ROOT}/index.html"

FOLLOW_BUILDERS_SCRIPTS="${FOLLOW_BUILDERS_SCRIPTS:-${HOME}/.claude/skills/follow-builders/scripts}"
ALLOW_GIT_PULL_FAILURE="${ALLOW_GIT_PULL_FAILURE:-0}"

GIT_AUTHOR_NAME_DEFAULT="${GIT_AUTHOR_NAME_DEFAULT:-luolan0214}"
GIT_AUTHOR_EMAIL_DEFAULT="${GIT_AUTHOR_EMAIL_DEFAULT:-luolan0214@users.noreply.github.com}"

mkdir -p "${ISSUES_DIR}" "${DATA_ISSUES_DIR}"

if [[ ! -d "${FOLLOW_BUILDERS_SCRIPTS}" ]]; then
  echo "Follow Builders scripts not found: ${FOLLOW_BUILDERS_SCRIPTS}" >&2
  exit 1
fi

CURRENT_BRANCH="$(git -C "${REPO_ROOT}" branch --show-current)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  echo "Expected to run on main branch, got: ${CURRENT_BRANCH}" >&2
  exit 1
fi

if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain)" ]]; then
  echo "Repository is not clean. Commit or stash changes before running the daily publisher." >&2
  exit 1
fi

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  if ! git -C "${REPO_ROOT}" pull --rebase origin main; then
    if [[ "${ALLOW_GIT_PULL_FAILURE}" == "1" ]]; then
      echo "git pull failed; continuing with the current local main checkout." >&2
    else
      exit 1
    fi
  fi
fi

if [[ "${SKIP_AGENT:-0}" != "1" ]]; then
  FOLLOW_BUILDERS_SCRIPTS="${FOLLOW_BUILDERS_SCRIPTS}" \
  node "${REPO_ROOT}/scripts/build-daily-newsletter-json.js" "${DATE}"
fi

if [[ ! -f "${JSON_PATH}" ]]; then
  echo "No JSON file generated for ${DATE}; skipping publish."
  exit 0
fi

node "${REPO_ROOT}/scripts/render-ai-builders-digest.js" "${JSON_PATH}" "${HTML_PATH}"
node "${REPO_ROOT}/sync-site-avatars.js"
node "${REPO_ROOT}/scripts/update-index-archive.js" "${INDEX_PATH}"

CHANGED_FILES="$(git -C "${REPO_ROOT}" status --porcelain)"
if [[ -z "${CHANGED_FILES}" ]]; then
  echo "No changes detected after render; skipping commit and push."
  exit 0
fi

git -C "${REPO_ROOT}" add "${JSON_PATH}" "${HTML_PATH}" "${INDEX_PATH}" "${REPO_ROOT}/assets" "${ISSUES_DIR}" "${DATA_ISSUES_DIR}"

GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-${GIT_AUTHOR_NAME_DEFAULT}}"
GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-${GIT_AUTHOR_EMAIL_DEFAULT}}"
GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-${GIT_AUTHOR_NAME}}"
GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-${GIT_AUTHOR_EMAIL}}"

GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME}" \
GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL}" \
GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME}" \
GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL}" \
git -C "${REPO_ROOT}" commit -m "$(cat <<EOF
Publish AI Builders Digest for ${DATE}

Refresh the daily newsletter JSON, rendered HTML issue, archive index, and site assets from the latest Follow Builders feed.
EOF
)"

if [[ "${SKIP_PUSH:-0}" != "1" ]]; then
  git -C "${REPO_ROOT}" push origin main
fi

echo "Published daily newsletter for ${DATE}"
