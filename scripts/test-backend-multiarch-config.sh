#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_FILE="$ROOT_DIR/.gitea/workflows/backend-image.yml"
DOCKERFILE="$ROOT_DIR/backend/Dockerfile"

grep -F "docker buildx build" "$WORKFLOW_FILE" >/dev/null
grep -F -- "--platform linux/amd64,linux/arm64" "$WORKFLOW_FILE" >/dev/null
grep -F "docker/setup-qemu-action@v3" "$WORKFLOW_FILE" >/dev/null
grep -F "docker buildx imagetools inspect" "$WORKFLOW_FILE" >/dev/null
grep -F "linux/amd64" "$WORKFLOW_FILE" >/dev/null
grep -F "linux/arm64" "$WORKFLOW_FILE" >/dev/null

grep -F "ARG TARGETOS" "$DOCKERFILE" >/dev/null
grep -F "ARG TARGETARCH" "$DOCKERFILE" >/dev/null
grep -F 'GOOS=$TARGETOS' "$DOCKERFILE" >/dev/null
grep -F 'GOARCH=$TARGETARCH' "$DOCKERFILE" >/dev/null

echo "PASS"
