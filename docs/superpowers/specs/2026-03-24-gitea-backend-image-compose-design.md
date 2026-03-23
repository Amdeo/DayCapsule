# Gitea Backend Image Compose Artifact Design

## 背景

当前仓库的后端已经具备单机 Docker Compose 部署基础：

- 后端为单个 Go 服务，运行时依赖 SQLite 文件和本地上传目录
- 已存在 [`backend/Dockerfile`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/gitea-backend-image-compose/backend/Dockerfile)
- 已存在根目录 [`docker-compose.yml`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/gitea-backend-image-compose/docker-compose.yml) 与 [`nginx.conf`](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/gitea-backend-image-compose/nginx.conf)

用户希望将“构建镜像”和“服务器部署”拆开：

- Gitea Actions 负责构建后端镜像并推送到 Gitea Container Registry
- 同时生成一个可下载的部署制品
- 制品内包含已经固定到本次镜像版本的 `docker-compose.yml`
- 服务器不需要跑 Gitea 自动部署，只需下载制品后执行 `docker compose up -d`
- 制品格式选择为 `zip`

## 目标

实现一条稳定的发布链路：

1. 代码进入主分支后，Gitea Actions 对后端执行测试、构建镜像、推送镜像
2. Workflow 同时生成一个 `zip` 部署制品
3. 制品中包含与本次镜像 tag 严格绑定的 Compose 配置和运行说明
4. 用户在服务器上无需 checkout 仓库即可启动后端

## 非目标

本次不覆盖以下范围：

- Gitea Actions 自动 SSH 到服务器部署
- 多副本部署或滚动发布
- PostgreSQL、对象存储、Kubernetes
- 前端 App 构建与发布

## 方案选择

### 方案 A：镜像 + 版本绑定部署制品

在 workflow 中：

- 生成镜像 tag（优先 tag 名，其次短 SHA）
- 推送镜像到 Gitea Registry
- 基于模板渲染出带具体镜像引用的 `docker-compose.yml`
- 将 compose、`.env.example`、`nginx.conf`、部署说明打包为 `zip`

优点：

- 服务器拿到制品即可运行
- 部署制品与镜像版本一一对应
- 回滚简单，下载旧版本制品即可

这是本次采用的方案。

### 方案 B：只推镜像，Compose 用环境变量控制版本

优点是仓库文件更少，但服务器还要自己管理 `IMAGE_TAG`，容易出现镜像和配置不对应的问题，不采用。

### 方案 C：制品永远引用 `latest`

实现简单，但不可审计、不可精准回滚，不采用。

## 产物设计

### 1. Registry 镜像

镜像命名规则：

- Registry 主机来自 workflow 环境变量
- 镜像仓库命名为 `${REGISTRY}/${OWNER}/daycapsule-backend`

标签规则：

- Git tag 触发时：发布 `tag` 和 `sha-<shortsha>`
- 主分支 push 触发时：发布 `latest` 和 `sha-<shortsha>`
- 部署制品中的 compose 固定引用本次主标签，不依赖运行时拼接

### 2. 部署制品 zip

制品目录建议如下：

```text
daycapsule-backend-deploy-<version>.zip
├── docker-compose.yml
├── .env.example
├── nginx.conf
└── README.md
```

其中：

- `docker-compose.yml` 中 `api.image` 已写死为本次镜像 tag
- `.env.example` 提供用户可选覆盖项
- `nginx.conf` 直接可用
- `README.md` 只描述服务器下载、解压、配置、启动、升级、回滚步骤

## Compose 设计

新增一份“部署专用”模板，而不是直接复用根目录本地构建版 compose。

原因：

- 当前根目录 compose 使用 `build:`，适合本地源码部署
- 制品部署需要 `image:`，不应该要求服务器有源码
- 保留本地构建版 compose 可以避免影响现有本地开发/验证流程

部署专用 compose 约束：

- `api` 使用具体镜像 tag
- 挂载 `./data:/app/data`
- 挂载 `./logs:/app/logs`
- `JWT_SECRET` 必填
- `BASE_URL`、`PORT` 等提供默认值或从 `.env` 覆盖
- `nginx` 继续保留，用于对外暴露端口和转发到 `api`

## Workflow 设计

新增一个后端发布 workflow，职责如下：

1. 检出仓库
2. 安装 Go
3. 运行 `go test ./...`
4. 登录 Gitea Container Registry
5. 构建并推送后端镜像
6. 基于模板生成部署制品目录
7. 打包为 `zip`
8. 上传 workflow artifact

认证设计：

- 使用单独的 Registry 用户名和 PAT
- 不依赖 `GITEA_TOKEN` 直接发布包仓库，避免 Gitea 已知限制

## 脚本与模板边界

为了降低 workflow YAML 复杂度，增加一层仓库内脚本：

- 一个模板 compose 文件，保留镜像占位符
- 一个构建部署制品的脚本，接收版本号与镜像地址并输出 zip 目录

好处：

- 本地也能手动生成同样的制品，便于调试
- workflow 不需要内嵌大段 shell 模板替换逻辑
- 测试可以聚焦在脚本输出是否正确

## 测试策略

自动验证至少覆盖：

- `cd backend && go test ./...`
- 部署制品生成脚本测试：确认输出 `docker-compose.yml` 包含预期镜像 tag
- `docker compose config` 对生成后的 compose 做语法校验

## 风险与约束

### 1. 单机约束

当前后端把 SQLite 和上传文件都写在本地目录，这决定了部署模型仍然是单机单实例。这是已知约束，不是本次方案新增问题。

### 2. Registry 认证

服务器在首次拉取私有镜像前，需要先对 Gitea Registry 做 `docker login`。这需要在部署说明里明确写出。

### 3. 回滚策略

回滚方式应是“下载旧制品并重新 `docker compose up -d`”，而不是修改 `latest`。

## 验收标准

满足以下条件即认为完成：

- 仓库新增 Gitea Actions workflow，可对后端测试、构建、推送镜像
- workflow 产出 `zip` 制品
- 制品内 `docker-compose.yml` 固定指向本次镜像版本
- 制品可在无源码的 Linux 服务器目录中直接运行
- 提供 `.env.example`，但运行不强依赖必须存在 `.env`
- 本地验证脚本和生成后的 compose 配置通过
