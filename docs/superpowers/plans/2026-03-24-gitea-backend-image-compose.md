# Gitea Backend Image Compose Artifact Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为后端新增 Gitea Actions 镜像发布流程，并生成包含版本绑定 `docker-compose.yml` 的 `zip` 部署制品。

**Architecture:** 保留根目录现有本地构建版 compose，不直接改造成镜像部署版；新增一套部署模板和产物生成脚本，由 workflow 先跑后端测试，再登录 Gitea Registry 推镜像，最后渲染出版本绑定的部署目录并打包为 `zip` artifact。

**Tech Stack:** Gitea Actions, Go 1.23, Docker, Docker Compose, Bash, zip

---

## Chunk 1: 部署制品模板与生成脚本

### Task 1: 新增部署专用 Compose 模板

**Files:**
- Create: `deploy/backend/docker-compose.template.yml`
- Create: `deploy/backend/.env.example`
- Copy/Reference: `nginx.conf`

- [ ] **Step 1: 写出模板所需的最小变量清单**

确认模板仅依赖这些占位变量：

- `__BACKEND_IMAGE__`
- `__PORT__`
- `__BASE_URL__`

运行时环境变量只保留真正需要给容器的值，例如 `JWT_SECRET`、`DATABASE_PATH`、`UPLOAD_DIR`。

- [ ] **Step 2: 编写部署专用 compose 模板**

要求：

- `api.image` 使用 `__BACKEND_IMAGE__`
- 不使用 `build:`
- `api` 挂载 `./data:/app/data`
- `api` 挂载 `./logs:/app/logs`
- `nginx` 挂载本地 `./nginx.conf`
- `ports` 默认对外暴露 `8080`

- [ ] **Step 3: 编写部署用 `.env.example`**

包含：

- `JWT_SECRET`
- `PORT`
- `BASE_URL`
- `DATABASE_PATH`
- `UPLOAD_DIR`

并为非敏感值提供合理默认值。

- [ ] **Step 4: 手动检查模板内容**

Run: `sed -n '1,220p' deploy/backend/docker-compose.template.yml`

Expected: 出现 `image:` 且不再包含 `build:`

### Task 2: 先写失败测试，再实现部署制品生成脚本

**Files:**
- Create: `scripts/test-build-backend-deploy-bundle.sh`
- Create: `scripts/build-backend-deploy-bundle.sh`
- Create: `deploy/backend/README.template.md`

- [ ] **Step 1: 写失败测试**

测试脚本行为：

- 传入输出目录、镜像地址、版本号
- 调用生成脚本
- 断言输出目录里存在：
  - `docker-compose.yml`
  - `.env.example`
  - `nginx.conf`
  - `README.md`
- 断言生成的 compose 中包含指定镜像 tag
- 断言生成的 README 中包含版本号

- [ ] **Step 2: 运行测试确认失败**

Run: `bash scripts/test-build-backend-deploy-bundle.sh`

Expected: FAIL，提示生成脚本不存在或输出文件缺失

- [ ] **Step 3: 实现最小生成脚本**

生成脚本职责：

- 校验必填参数
- 创建输出目录
- 用 `sed` 或等价方式替换模板中的镜像和版本占位符
- 复制 `.env.example` 与 `nginx.conf`
- 生成最终 `README.md`

- [ ] **Step 4: 运行测试确认通过**

Run: `bash scripts/test-build-backend-deploy-bundle.sh`

Expected: PASS

- [ ] **Step 5: 用 compose 校验生成结果**

Run: `docker compose -f /tmp/daycapsule-backend-bundle-test/docker-compose.yml config`

Expected: exit 0

## Chunk 2: Gitea Actions 镜像发布与 zip 制品

### Task 3: 新增 workflow

**Files:**
- Create: `.gitea/workflows/backend-image.yml`

- [ ] **Step 1: 写出 workflow 的输入输出约定**

要求：

- `push` 到 `main` 时执行
- `push` tag 时执行
- 支持手动 `workflow_dispatch`
- 使用 secrets：
  - `REGISTRY_URL`
  - `REGISTRY_USERNAME`
  - `REGISTRY_PASSWORD`

- [ ] **Step 2: 实现 workflow**

关键步骤：

- checkout
- setup-go
- `cd backend && go test ./...`
- `docker login`
- 计算镜像 tag 与完整镜像名
- `docker build -t ... backend`
- `docker push ...`
- 调用 `scripts/build-backend-deploy-bundle.sh`
- `zip -r` 打包制品目录
- 上传 artifact

- [ ] **Step 3: 做静态检查**

Run: `sed -n '1,260p' .gitea/workflows/backend-image.yml`

Expected: 包含测试、登录、构建、推送、打包、上传这几步

### Task 4: 补文档

**Files:**
- Modify: `docs/BACKEND_DEPLOYMENT.md`
- Optionally Modify: `README.md`

- [ ] **Step 1: 更新后端部署文档**

新增一节说明：

- 如何从 Gitea Actions 下载 zip 制品
- 如何登录 Gitea Registry
- 如何复制 `.env.example` 为 `.env`
- 如何 `docker compose up -d`
- 如何升级与回滚

- [ ] **Step 2: 如有必要，在 README 补一条入口**

只补索引，不重复长篇部署说明。

## Chunk 3: 全量验证

### Task 5: 逐层验证交付

**Files:**
- Verify only

- [ ] **Step 1: 运行后端测试**

Run: `cd backend && go test ./...`

Expected: PASS

- [ ] **Step 2: 运行部署制品脚本测试**

Run: `bash scripts/test-build-backend-deploy-bundle.sh`

Expected: PASS

- [ ] **Step 3: 用真实参数生成一次部署目录**

Run: `bash scripts/build-backend-deploy-bundle.sh /tmp/daycapsule-backend-release registry.example.com/owner/daycapsule-backend:sha-test sha-test`

Expected: 输出目录生成成功

- [ ] **Step 4: 校验生成后的 compose**

Run: `docker compose -f /tmp/daycapsule-backend-release/docker-compose.yml config`

Expected: PASS

- [ ] **Step 5: 检查 git diff**

Run: `git diff --stat`

Expected: 仅包含 workflow、脚本、部署模板和文档相关改动
