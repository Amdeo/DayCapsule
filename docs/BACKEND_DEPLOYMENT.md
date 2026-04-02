# MemoryCapsule 后端部署文档

## 当前部署事实

这份文档只描述当前仓库里已经存在、且可直接核对的后端部署方式。

当前仓库可核对的部署相关文件：

- 根目录 `docker-compose.yml`
- 根目录 `nginx.conf`
- `backend/internal/config/config.go`
- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/README.template.md`

当前默认链路：

```text
客户端 -> 宿主机:${PORT:-8080} -> nginx:80 -> api:3000
```

当前 `docker-compose.yml` 中的两个服务：

- `api`
  - 从 `backend/Dockerfile` 构建
  - 容器名为 `daycapsule-api`
  - 容器内监听 `3000`
  - 使用 `/app/data` 保存数据库和上传文件
  - 使用 `/app/logs` 保存日志
- `nginx`
  - 使用 `nginx:alpine`
  - 容器名为 `daycapsule-nginx`
  - 读取根目录 `nginx.conf`
  - 对外暴露 `${PORT:-8080}`

`nginx.conf` 当前会：

- 将 `/health` 代理到 `http://api/health`
- 将其余请求代理到 `http://api`
- 设置 `client_max_body_size 50M`

## 当前相关文件

仓库根目录部署对应的文件：

- `docker-compose.yml`
- `nginx.conf`
- `backend/internal/config/config.go`

发布包模板对应的文件：

- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/README.template.md`

## 当前配置项

`backend/internal/config/config.go` 当前读取的配置项包括：

- `PORT`，默认 `3000`
- `DATABASE_PATH`，默认 `./data/daycapsule.db`
- `JWT_SECRET`，默认空字符串
- `JWT_EXPIRY`，默认 `168`
- `REFRESH_EXPIRY`，默认 `720`
- `UPLOAD_DIR`，默认 `./data/uploads`
- `BASE_URL`，默认 `http://localhost:3000`

根目录 `docker-compose.yml` 当前传入的关键环境变量包括：

- `DATABASE_PATH=${DATABASE_PATH:-/app/data/daycapsule.db}`
- `JWT_SECRET=${JWT_SECRET:-your-secret-key-min-32-chars-change-in-production}`
- `ENV=production`
- `PORT=3000`
- `UPLOAD_DIR=/app/data/uploads`
- `BASE_URL=${BASE_URL:-http://localhost:8080}`

当前部署相关关键变量：

- `JWT_SECRET`
- `BASE_URL`
- `PORT`
- `DATABASE_PATH`
- `UPLOAD_DIR`

## 最小部署路径

当前仓库根目录部署路径由根目录 `docker-compose.yml` 与根目录 `nginx.conf` 组成。

示例：

```bash
export JWT_SECRET='replace-with-a-long-random-string-at-least-32-chars'
export BASE_URL='http://YOUR_SERVER_IP:8080'
mkdir -p logs backend/data
docker compose up -d --build
```

说明：

- `logs` 会挂载到容器内 `/app/logs`
- `backend/data` 会挂载到容器内 `/app/data`
- SQLite 数据库文件默认会落在 `/app/data/daycapsule.db`
- 上传文件默认会落在 `/app/data/uploads`

启动后的常见检查命令：

```bash
docker compose ps
docker compose logs api --tail=100
curl http://127.0.0.1:8080/health
```

## 数据目录与日志目录

当前根目录 compose 使用的持久化目录是：

- 数据目录：`backend/data`
- 日志目录：`logs`

其中数据目录会映射到容器内 `/app/data`，当前包括：

- SQLite 数据库文件
- 上传文件目录

发布包模板中的 `deploy/backend/docker-compose.template.yml` 当前使用：

- `./data:/app/data`
- `./logs:/app/logs`

## 发布包模板相关文件

- `deploy/backend/docker-compose.template.yml`：发布包模板 compose 文件
- `deploy/backend/README.template.md`：发布包模板说明文件

发布包方式对应的模板文件包括 compose 与说明文件。

## 相关文件

仓库入口与常用命令相关文档：

- `README.md`
- `docs/QUICK_REFERENCE.md`

部署相关文件：

- `docker-compose.yml`
- `nginx.conf`
- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/README.template.md`
