# Gitea Backend Multi-Arch Image Design

## 背景

当前后端镜像由 Gitea Actions 在 [`.gitea/workflows/backend-image.yml`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/fix-backend-image-amd64/.gitea/workflows/backend-image.yml) 中构建并推送，运行镜像的入口是 [`backend/Dockerfile`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/fix-backend-image-amd64/backend/Dockerfile) 产出的 `./server`。

线上已经出现明确故障：

- 部署后的容器持续报错 `exec ./server: exec format error`
- 部署目标服务器是 `amd64`
- 当前 Dockerfile 只显式设置了 `GOOS=linux`，未显式设置 `GOARCH`
- 当前 workflow 使用普通 `docker build`，未显式声明 `--platform`

这意味着镜像内二进制的目标架构会跟随构建机环境。如果 Gitea runner 恰好运行在 `arm64` 上，镜像内的 `server` 就会被编译为 `arm64`，随后在 `amd64` 服务器上启动失败。

## 目标

本次调整要达成以下目标：

1. 后端镜像发布为统一标签的多架构镜像，同时支持 `linux/amd64` 与 `linux/arm64`
2. `amd64` 服务器重新拉取同一镜像标签后，可以自动获取正确架构的镜像变体
3. 未来即使 Gitea runner 架构变化，发布结果仍保持稳定
4. 保持现有部署制品格式与部署方式不变

## 非目标

本次不覆盖以下内容：

- 改造服务器部署方式
- 拆分出独立的 `amd64`、`arm64` 镜像标签供人工选择
- 调整后端运行时配置、Compose 模板、Nginx 配置
- 将部署模式从单机 Compose 升级为集群编排

## 根因分析

### 现状链路

当前问题链路如下：

1. Gitea workflow 在 runner 上执行 `docker build`
2. Dockerfile 在 builder 阶段执行 `go build -o server ./cmd/server`
3. 因为未显式传入 `GOARCH`，Go 默认使用构建环境当前架构
4. 最终镜像内只包含单一架构的 `./server`
5. 服务器拉取到不匹配自身 CPU 的镜像后，进程启动即报 `exec format error`

### 为什么不是部署 bundle 的问题

部署 bundle 只负责渲染 `docker-compose.yml`、`.env.example`、`README.md` 和 `nginx.conf`，并不会参与二进制编译或镜像分发。因此这次问题不在 bundle，而在镜像构建与发布产物的架构声明缺失。

## 方案对比

### 方案 A：使用 Buildx 发布统一标签的多架构镜像

做法：

- 在 workflow 中使用 `docker buildx build`
- 明确指定 `--platform linux/amd64,linux/arm64`
- 在 Dockerfile 中接收 `TARGETOS`、`TARGETARCH`
- Go 编译显式使用 `GOOS=$TARGETOS GOARCH=$TARGETARCH`
- 构建完成后直接推送 manifest list

优点：

- 同一个镜像标签即可同时支持 `amd64` 和 `arm64`
- 部署端无需感知架构差异
- 不依赖 Gitea runner 当前 CPU 架构
- 最符合当前问题的根因修复方式

缺点：

- CI 构建时间会略长
- 对 runner 的 buildx/qemu 能力有依赖

这是本次采用的方案。

### 方案 B：只固定发布 `linux/amd64`

做法是仍使用单架构镜像，但在 workflow 中强制 `--platform linux/amd64`。

优点是改动最小，可以快速恢复当前 AMD 服务器可运行。

缺点是：

- 不满足本次已确认的双架构目标
- 如果后续需要部署到 ARM 环境，还需要再做一次改造
- 统一标签的可移植性仍然不足

因此不采用。

### 方案 C：分别发布 `amd64` 和 `arm64` 两套标签

这种方式可以解决兼容性，但会把架构选择转移到运维侧：

- 服务器部署时需要明确选择标签
- 回滚与升级时更容易选错
- 无法做到“同一标签自动适配宿主机架构”

因此不采用。

## 设计

## 1. Workflow 构建与发布

调整 [`.gitea/workflows/backend-image.yml`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/fix-backend-image-amd64/.gitea/workflows/backend-image.yml) 的镜像构建步骤：

1. 保留现有检出、Go 测试、bundle 测试、镜像元数据计算逻辑
2. 在 `docker/setup-buildx-action` 之前或之后增加 `docker/setup-qemu-action`
3. 将现有“构建镜像”和“推送镜像”两个 shell 步骤，替换为一次 `docker buildx build --platform linux/amd64,linux/arm64 --push`
4. 继续发布 `${image_repo}:${version}` 与 `${image_repo}:latest`
5. 构建成功后，对推送结果执行 manifest 检查，确认两个目标平台都存在

这样发布出去的标签本身就是 manifest list，Docker 在拉取时会根据宿主机架构自动选择对应镜像变体。

## 2. Dockerfile 跨架构编译

调整 [`backend/Dockerfile`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/fix-backend-image-amd64/backend/Dockerfile)：

- 在 builder 阶段声明 `ARG TARGETOS`
- 在 builder 阶段声明 `ARG TARGETARCH`
- Go 编译命令显式使用：

```sh
CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -a -installsuffix cgo -o server ./cmd/server
```

这样每次 buildx 为不同平台执行构建时，Go 二进制都会与目标镜像平台一致，而不是跟随 runner 本机架构。

最终运行时镜像仍保持精简：

- 不增加额外运行时诊断工具
- 不改变现有入口命令 `CMD ["./server"]`
- 不改变 migrations、data、logs 目录布局

## 3. 部署兼容性

部署 bundle 无需改动：

- 生成逻辑不变
- `docker-compose.yml` 仍只引用统一镜像标签
- 现有 AMD 服务器只需要重新拉取镜像并重启容器

兼容性结果如下：

- `amd64` 服务器会拉取 `linux/amd64` 变体
- `arm64` 服务器会拉取 `linux/arm64` 变体
- 运维不需要为不同 CPU 架构维护不同 compose 文件

## 4. 验证与回归防护

保留现有验证：

- `cd backend && go test ./...`
- `bash scripts/test-build-backend-deploy-bundle.sh`

新增验证分为两层。

### 第一层：发布结果验证

在 workflow 中增加 manifest 检查，确认目标标签同时包含：

- `linux/amd64`
- `linux/arm64`

如果缺任一平台，workflow 直接失败，避免继续产出“构建成功但只适用于单架构”的镜像。

### 第二层：配置意图验证

增加一个轻量测试脚本，至少检查：

1. workflow 明确声明 `linux/amd64,linux/arm64`
2. Dockerfile 在 Go 编译中使用 `TARGETARCH`

这类测试不需要真的本地推送多架构镜像，但可以防止未来修改时把关键声明改丢。

## 5. 风险与约束

### CI 构建时间增加

多架构构建会比单架构更慢，但这是换取发布稳定性和跨平台兼容性的必要成本。

### Runner 环境要求

workflow 依赖 buildx 与 qemu。若 Gitea runner 环境不支持，对应步骤会在 CI 阶段失败。这个失败是可接受的，因为它会阻止错误镜像继续流入部署环节。

### 私有仓库检查限制

manifest 检查需要对已推送标签有读取权限，应继续复用当前 registry 登录能力，而不是在匿名状态下校验。

## 验收标准

满足以下条件即认为完成：

- Gitea workflow 发布的后端镜像标签同时包含 `linux/amd64` 和 `linux/arm64`
- [`backend/Dockerfile`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/fix-backend-image-amd64/backend/Dockerfile) 显式按目标平台编译 Go 二进制
- 现有部署 bundle 生成流程保持可用且无需改造
- `amd64` 服务器重新拉取镜像后不再出现 `exec ./server: exec format error`
- 仓库内存在防止多架构声明回退的自动校验
