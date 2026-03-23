#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="/tmp/daycapsule-backend-bundle-test"
IMAGE_REF="registry.example.com/daycapsule/daycapsule-backend:sha-test"
RELEASE_VERSION="sha-test"

rm -rf "$OUTPUT_DIR"

bash "$ROOT_DIR/scripts/build-backend-deploy-bundle.sh" "$OUTPUT_DIR" "$IMAGE_REF" "$RELEASE_VERSION"

test -f "$OUTPUT_DIR/docker-compose.yml"
test -f "$OUTPUT_DIR/.env.example"
test -f "$OUTPUT_DIR/nginx.conf"
test -f "$OUTPUT_DIR/README.md"

grep -F "$IMAGE_REF" "$OUTPUT_DIR/docker-compose.yml" >/dev/null
grep -F "$RELEASE_VERSION" "$OUTPUT_DIR/README.md" >/dev/null
JWT_SECRET=test-secret docker compose -f "$OUTPUT_DIR/docker-compose.yml" config >/dev/null

echo "PASS"
