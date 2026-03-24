# Gitea Backend Multi-Arch Image Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Gitea Actions 构建出的后端镜像架构漂移问题，让同一标签同时支持 `linux/amd64` 和 `linux/arm64`。

**Architecture:** 保持现有部署 bundle 结构不变，只调整镜像构建链路。workflow 改为用 `docker buildx build` 发布多架构 manifest，Dockerfile 显式接收 `TARGETOS/TARGETARCH` 编译 Go 二进制；再补一条仓库内的静态回归测试，防止平台声明被改丢。

**Tech Stack:** Gitea Actions, Docker Buildx, QEMU, Dockerfile, Go 1.23, Bash

---

## Chunk 1: 防回归测试先行

### Task 1: 新增多架构配置意图测试

**Files:**
- Create: `scripts/test-backend-multiarch-config.sh`
- Verify: `.gitea/workflows/backend-image.yml`
- Verify: `backend/Dockerfile`

- [ ] **Step 1: 写失败测试**

测试脚本需要检查：

- workflow 包含 `linux/amd64,linux/arm64`
- workflow 使用 `docker buildx build`
- Dockerfile 使用 `TARGETOS`
- Dockerfile 使用 `TARGETARCH`
- Go 编译命令显式带上 `GOARCH=$TARGETARCH`

- [ ] **Step 2: 运行测试确认失败**

Run: `bash scripts/test-backend-multiarch-config.sh`

Expected: FAIL，因为当前 workflow 还没有双架构声明，Dockerfile 也没有 `TARGETARCH`

## Chunk 2: 最小实现修复

### Task 2: 修改 Dockerfile 支持按目标平台编译

**Files:**
- Modify: `backend/Dockerfile`
- Test: `scripts/test-backend-multiarch-config.sh`

- [ ] **Step 1: 最小修改 builder 参数**

要求：

- 增加 `ARG TARGETOS`
- 增加 `ARG TARGETARCH`
- `go build` 显式使用 `GOOS=$TARGETOS GOARCH=$TARGETARCH`

- [ ] **Step 2: 重新运行测试，确认仍失败但失败点转移到 workflow**

Run: `bash scripts/test-backend-multiarch-config.sh`

Expected: FAIL，只剩 workflow 相关断言失败

### Task 3: 修改 workflow 发布多架构镜像

**Files:**
- Modify: `.gitea/workflows/backend-image.yml`
- Test: `scripts/test-backend-multiarch-config.sh`

- [ ] **Step 1: 接入 buildx 多架构构建**

要求：

- 增加 `docker/setup-qemu-action@v3`
- 构建步骤改为 `docker buildx build`
- 平台固定 `linux/amd64,linux/arm64`
- 用一次 `--push` 同时推送 `${image_ref}` 和 `${latest_ref}`

- [ ] **Step 2: 增加 manifest 校验**

Run in workflow:

- `docker buildx imagetools inspect "${IMAGE_REF}"`
- 校验输出中同时出现 `linux/amd64` 与 `linux/arm64`

- [ ] **Step 3: 重新运行测试确认通过**

Run: `bash scripts/test-backend-multiarch-config.sh`

Expected: PASS

## Chunk 3: 全量验证与集成

### Task 4: 跑项目验证

**Files:**
- Verify only

- [ ] **Step 1: 运行后端测试**

Run: `go test ./...`

Workdir: `backend`

Expected: PASS

- [ ] **Step 2: 运行部署 bundle 测试**

Run: `bash scripts/test-build-backend-deploy-bundle.sh`

Expected: PASS

- [ ] **Step 3: 运行多架构配置测试**

Run: `bash scripts/test-backend-multiarch-config.sh`

Expected: PASS

- [ ] **Step 4: 检查变更范围**

Run: `git diff --stat main...HEAD`

Expected: 只包含 workflow、Dockerfile、测试脚本与本次 spec/plan 文档

### Task 5: 提交并合并

**Files:**
- Verify only

- [ ] **Step 1: 提交实现改动**

```bash
git add .gitea/workflows/backend-image.yml backend/Dockerfile scripts/test-backend-multiarch-config.sh docs/superpowers/specs/2026-03-25-gitea-backend-multiarch-image-design.md docs/superpowers/plans/2026-03-25-gitea-backend-multiarch-image.md
git commit -m "fix(ci): publish multi-arch backend images"
```

- [ ] **Step 2: 合并回 `main` 并在合并结果上复跑关键验证**

Run:

```bash
git checkout main
git merge fix/backend-image-amd64
go test ./...
bash scripts/test-build-backend-deploy-bundle.sh
bash scripts/test-backend-multiarch-config.sh
```

Expected: 全部通过
