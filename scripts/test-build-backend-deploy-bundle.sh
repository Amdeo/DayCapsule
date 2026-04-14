#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="/tmp/daycapsule-backend-bundle-test"
IMAGE_REF="registry.example.com/daycapsule/daycapsule-backend:sha-test"
RELEASE_VERSION="sha-test"

rm -rf "$OUTPUT_DIR"

bash "$ROOT_DIR/scripts/build-backend-deploy-bundle.sh" "$OUTPUT_DIR" "$IMAGE_REF" "$RELEASE_VERSION"

test -f "$OUTPUT_DIR/docker-compose.yml"
test -f "$OUTPUT_DIR/docker-compose.shared-nginx.yml"
test -f "$OUTPUT_DIR/.env.example"
test -f "$OUTPUT_DIR/deploy/backend/daycapsule.conf"
test -f "$OUTPUT_DIR/deploy/backend/daycapsule.host-nginx.conf"
test -f "$OUTPUT_DIR/README.md"

grep -F "$IMAGE_REF" "$OUTPUT_DIR/docker-compose.yml" >/dev/null
grep -F '${HOST_BIND:-127.0.0.1}:${HOST_PORT:-3000}:3000' "$OUTPUT_DIR/docker-compose.yml" >/dev/null
grep -F "shared-proxy" "$OUTPUT_DIR/docker-compose.shared-nginx.yml" >/dev/null
grep -F "daycapsule-api:3000" "$OUTPUT_DIR/deploy/backend/daycapsule.conf" >/dev/null
grep -F "127.0.0.1:3000" "$OUTPUT_DIR/deploy/backend/daycapsule.host-nginx.conf" >/dev/null
grep -F "listen 18080;" "$OUTPUT_DIR/deploy/backend/daycapsule.host-nginx.conf" >/dev/null
grep -F "$RELEASE_VERSION" "$OUTPUT_DIR/README.md" >/dev/null

config_output="$(JWT_SECRET=test-secret docker compose -f "$OUTPUT_DIR/docker-compose.yml" config)"
printf '%s\n' "$config_output" | grep -F "api:" >/dev/null
printf '%s\n' "$config_output" | grep -F "host_ip: 127.0.0.1" >/dev/null
printf '%s\n' "$config_output" | grep -F 'published: "3000"' >/dev/null
if printf '%s\n' "$config_output" | grep -F "nginx:" >/dev/null; then
  echo "unexpected nginx service in deploy bundle" >&2
  exit 1
fi

shared_config_output="$(JWT_SECRET=test-secret docker compose -f "$OUTPUT_DIR/docker-compose.shared-nginx.yml" config)"
printf '%s\n' "$shared_config_output" | grep -F "shared-proxy:" >/dev/null
printf '%s\n' "$shared_config_output" | grep -F "api:" >/dev/null
if printf '%s\n' "$shared_config_output" | grep -F "nginx:" >/dev/null; then
  echo "unexpected nginx service in shared deploy bundle" >&2
  exit 1
fi
if printf '%s\n' "$shared_config_output" | grep -F "127.0.0.1:3000:3000" >/dev/null; then
  echo "unexpected host loopback port mapping in shared deploy bundle" >&2
  exit 1
fi

echo "PASS"
