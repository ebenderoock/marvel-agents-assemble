#!/usr/bin/env bash
# Marvel Agents — Copilot CLI Extension Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ebenderoock/marvel-agents-assemble/main/install.sh | bash
# Or:    bash install.sh [--uninstall]

set -euo pipefail

REPO="ebenderoock/marvel-agents-assemble"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
EXT_DIR="${HOME}/.copilot/extensions/marvel-agents"
FILES=("extension.mjs" "characters.json" "trivia.json")
SRC_DIR=".github/extensions/marvel-agents"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

# ---- Uninstall ----
if [[ "${1:-}" == "--uninstall" ]]; then
  if [[ -d "$EXT_DIR" ]]; then
    rm -rf "$EXT_DIR"
    green "🗑️  Marvel Agents uninstalled."
  else
    echo "Nothing to uninstall — ${EXT_DIR} not found."
  fi
  exit 0
fi

# ---- Install ----
bold "🦸 Installing Marvel Agents extension..."

mkdir -p "$EXT_DIR"

for file in "${FILES[@]}"; do
  echo "  Downloading ${file}..."
  if ! curl -fsSL "${BASE_URL}/${SRC_DIR}/${file}" -o "${EXT_DIR}/${file}"; then
    red "Failed to download ${file}"
    exit 1
  fi
done

green "✅ Installed to ${EXT_DIR}"
echo ""
echo "Restart Copilot CLI (or run /clear) to load the extension."
echo "Then try:  marvel_summon deadpool"
echo ""
echo "To uninstall:  curl -fsSL ${BASE_URL}/install.sh | bash -s -- --uninstall"
