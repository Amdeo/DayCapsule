#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <output-dir> <image-ref> <release-version>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$1"
IMAGE_REF="$2"
RELEASE_VERSION="$3"
REGISTRY_HOST="${IMAGE_REF%%/*}"

mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/deploy/backend"

sed \
  -e "s|__BACKEND_IMAGE__|$IMAGE_REF|g" \
  -e "s|__BASE_URL__|http://localhost:8080|g" \
  -e "s|__PORT__|8080|g" \
  "$ROOT_DIR/deploy/backend/docker-compose.template.yml" \
  > "$OUTPUT_DIR/docker-compose.yml"

sed \
  -e "s|__BACKEND_IMAGE__|$IMAGE_REF|g" \
  -e "s|__RELEASE_VERSION__|$RELEASE_VERSION|g" \
  -e "s|__REGISTRY_HOST__|$REGISTRY_HOST|g" \
  "$ROOT_DIR/deploy/backend/README.template.md" \
  > "$OUTPUT_DIR/README.md"

cp "$ROOT_DIR/deploy/backend/.env.example" "$OUTPUT_DIR/.env.example"
cp "$ROOT_DIR/deploy/backend/nginx.conf" "$OUTPUT_DIR/deploy/backend/nginx.conf"

echo "Deploy bundle generated at $OUTPUT_DIR"
