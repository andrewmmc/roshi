#!/usr/bin/env bash
set -euo pipefail

VERSION=${1:-}

if [[ -z "$VERSION" ]]; then
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh v1.0.0"
  exit 1
fi

if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Version must match semver format (e.g., v1.0.0 or v1.0.0-beta)"
  exit 1
fi

git tag -a "$VERSION" -m "Release $VERSION"
git push origin "$VERSION"

echo "✓ Release $VERSION tagged and pushed"
echo "  Watch: https://github.com/$(git remote get-url origin | sed 's|.*github.com[:/]||' | sed 's|\.git||')/actions"
