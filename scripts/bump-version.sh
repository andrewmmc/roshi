#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: ./scripts/bump-version.sh [patch|minor|major|x.y.z|vx.y.z] [--dry-run]

Updates all release version files:
  - package.json
  - package-lock.json
  - src-tauri/tauri.conf.json
  - src-tauri/Cargo.toml
  - src-tauri/Cargo.lock

Examples:
  ./scripts/bump-version.sh patch
  ./scripts/bump-version.sh minor
  ./scripts/bump-version.sh 1.2.3
  ./scripts/bump-version.sh v1.2.3-beta
EOF
}

TARGET="patch"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    patch|minor|major|v[0-9]*.[0-9]*.[0-9]*|[0-9]*.[0-9]*.[0-9]*)
      TARGET="$1"
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
  shift
done

cd "$REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required" >&2
  exit 1
fi

current="$(node -p "require('./package.json').version")"
semver_re='^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z][0-9A-Za-z.-]*)?$'

case "$TARGET" in
  major|minor|patch)
    if ! [[ "$current" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
      echo "Error: ${TARGET} bumps require a plain x.y.z current version, got '${current}'" >&2
      exit 1
    fi

    major="${BASH_REMATCH[1]}"
    minor="${BASH_REMATCH[2]}"
    patch="${BASH_REMATCH[3]}"

    case "$TARGET" in
      major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
      minor)
        minor=$((minor + 1))
        patch=0
        ;;
      patch)
        patch=$((patch + 1))
        ;;
    esac

    next="${major}.${minor}.${patch}"
    ;;
  *)
    next="${TARGET#v}"
    if ! [[ "$next" =~ $semver_re ]]; then
      usage >&2
      exit 1
    fi
    ;;
esac

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Would bump Roshi ${current} -> ${next}"
  exit 0
fi

node - "$next" <<'NODE'
const fs = require('node:fs');

const version = process.argv[2];

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const packageLockPath = 'package-lock.json';
const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
packageLock.version = version;
packageLock.packages[''].version = version;
fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);

const tauriConfigPath = 'src-tauri/tauri.conf.json';
const tauriConfig = fs.readFileSync(tauriConfigPath, 'utf8');
fs.writeFileSync(
  tauriConfigPath,
  tauriConfig.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`),
);

const cargoTomlPath = 'src-tauri/Cargo.toml';
const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
fs.writeFileSync(
  cargoTomlPath,
  cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`),
);

const cargoLockPath = 'src-tauri/Cargo.lock';
const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
const nextCargoLock = cargoLock.replace(
  /(\[\[package\]\]\nname = "roshi"\nversion = ")[^"]+(")/,
  `$1${version}$2`,
);

if (nextCargoLock === cargoLock && !cargoLock.includes(`name = "roshi"\nversion = "${version}"`)) {
  throw new Error('Could not find roshi package entry in src-tauri/Cargo.lock');
}

fs.writeFileSync(cargoLockPath, nextCargoLock);
NODE

echo "Bumped Roshi ${current} -> ${next}"
