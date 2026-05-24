#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_PATH="${REPO_ROOT}/launchd/com.luolan.follow-builders-newsletter.plist.template"
TARGET_DIR="${HOME}/Library/LaunchAgents"
TARGET_PATH="${TARGET_DIR}/com.luolan.follow-builders-newsletter.plist"
LOG_DIR="${HOME}/Library/Logs"
USER_UID="$(id -u)"

mkdir -p "${TARGET_DIR}" "${LOG_DIR}"

sed \
  -e "s|__REPO_ROOT__|${REPO_ROOT}|g" \
  -e "s|__HOME__|${HOME}|g" \
  "${TEMPLATE_PATH}" > "${TARGET_PATH}"

chmod 644 "${TARGET_PATH}"
chmod +x "${REPO_ROOT}/scripts/publish-daily-newsletter.sh"
chmod +x "${REPO_ROOT}/scripts/run-scheduled-newsletter-publisher.sh"

launchctl bootout "gui/${USER_UID}" "${TARGET_PATH}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/${USER_UID}" "${TARGET_PATH}"
launchctl enable "gui/${USER_UID}/com.luolan.follow-builders-newsletter"

echo "Installed launchd job:"
echo "  ${TARGET_PATH}"
echo
echo "It is scheduled to run at 08:00 / 08:30 / 08:50 / 10:00 / 11:00 / 12:00 / 16:00 Asia/Shanghai."
echo "RunAtLoad is enabled so the publisher catches up after reboot/login as well."
