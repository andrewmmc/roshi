#!/usr/bin/env bash
set -euo pipefail

cmd="${1:?missing command}"

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_node() {
  # already available
  if has_cmd node && has_cmd npm; then
    return 0
  fi

  # fnm
  if has_cmd fnm; then
    eval "$(fnm env --shell bash)" || true
    if [ -f ".nvmrc" ]; then
      fnm use >/dev/null 2>&1 || true
    fi
    if has_cmd node && has_cmd npm; then
      return 0
    fi
  fi

  # nvm
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    if [ -f ".nvmrc" ]; then
      nvm use >/dev/null 2>&1 || true
    fi
    if has_cmd node && has_cmd npm; then
      return 0
    fi
  fi

  # asdf
  if [ -s "$HOME/.asdf/asdf.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.asdf/asdf.sh"
    if has_cmd node && has_cmd npm; then
      return 0
    fi
  fi

  # volta
  export PATH="$HOME/.volta/bin:$PATH"
  if has_cmd node && has_cmd npm; then
    return 0
  fi

  return 1
}

if ! ensure_node; then
  echo "Node/npm not found for git hook."
  echo "Checked: PATH, fnm, nvm, asdf, volta."
  exit 127
fi

bash -lc "$cmd"
