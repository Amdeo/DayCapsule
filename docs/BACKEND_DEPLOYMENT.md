# MemoryCapsule 后端部署文档

## 当前部署事实

这份文档只描述当前仓库里已经存在、且可直接核对的后端部署方式。

当前仓库可核对的部署相关文件：

- 根目录 `docker-compose.yml`
- `deploy/backend/nginx.conf`
- `deploy/backend/daycapsule.conf`
- `deploy/backend/daycapsule.host-nginx.conf`
- `deploy/backend/docker-compose.host-nginx.template.yml`
- `deploy/shared-nginx/docker-compose.yml`
- `backend/internal/config/config.go`
- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/README.template.md`

当前仓库里同时存在两种部署路径：

- 根目录独立部署：`docker-compose.yml + deploy/backend/nginx.conf`
- 发布包本地 nginx 部署：`deploy/backend/docker-compose.host-nginx.template.yml + deploy/backend/daycapsule.host-nginx.conf`
- 发布包共享 nginx 部署：`deploy/backend/docker-compose.template.yml + deploy/backend/daycapsule.conf`

另外仓库还提供了一套共享 nginx 容器部署目录：

- `deploy/shared-nginx/docker-compose.yml`

根目录默认链路：

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
  - 读取 `deploy/backend/nginx.conf`
  - 对外暴露 `${PORT:-8080}`

`deploy/backend/nginx.conf` 当前会：

- 将 `/health` 代理到 `http://api/health`
- 将其余请求代理到 `http://api`
- 设置 `client_max_body_size 50M`

## 当前相关文件

仓库根目录部署对应的文件：

- `docker-compose.yml`
- `deploy/backend/nginx.conf`
- `backend/internal/config/config.go`

发布包模板对应的文件：

- `deploy/backend/docker-compose.host-nginx.template.yml`
- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/daycapsule.host-nginx.conf`
- `deploy/backend/daycapsule.conf`
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

当前仓库根目录部署路径由根目录 `docker-compose.yml` 与 `deploy/backend/nginx.conf` 组成。

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
- 外部网络 `${PROXY_NETWORK:-shared-proxy}`
- `deploy/backend/daycapsule.conf` 作为共享 nginx 的 `conf.d` 片段

发布包模板中的 `deploy/backend/docker-compose.host-nginx.template.yml` 当前使用：

- `./data:/app/data`
- `./logs:/app/logs`
- `127.0.0.1:${HOST_PORT:-3000}:3000`
- `deploy/backend/daycapsule.host-nginx.conf` 作为服务器本地 nginx 站点配置

## 发布包模板相关文件

- `deploy/backend/docker-compose.host-nginx.template.yml`：服务器本地 nginx 模式 compose 模板
- `deploy/backend/docker-compose.template.yml`：发布包模板 compose 文件
- `deploy/backend/daycapsule.host-nginx.conf`：服务器本地 nginx 站点配置片段
- `deploy/backend/daycapsule.conf`：共享 nginx 站点配置片段
- `deploy/backend/README.template.md`：发布包模板说明文件

发布包方式对应的模板文件包括 compose 与说明文件。

## 相关文件

仓库入口与常用命令相关文档：

- `README.md`
- `docs/QUICK_REFERENCE.md`

部署相关文件：

- `docker-compose.yml`
- `deploy/backend/nginx.conf`
- `deploy/backend/daycapsule.host-nginx.conf`
- `deploy/backend/daycapsule.conf`
- `deploy/backend/docker-compose.host-nginx.template.yml`
- `deploy/backend/docker-compose.template.yml`
- `deploy/backend/README.template.md`
- `deploy/shared-nginx/docker-compose.yml`

## 给其他项目的提示词模板

如果以后你要让其他项目按同样方式交付，可以直接把下面这段话发给对方：

```text
我的服务器上已经有一个共享的 nginx 容器，多个服务共用这一层反向代理。

请按“共享 nginx”方式交付，不要再给我做一个独立对外暴露 80/443 端口的 nginx 容器。

交付要求：
1. 应用本身用 docker compose 部署，最好只包含业务服务本身
2. 不要占用宿主机 80/443 端口
3. 服务接入一个外部 Docker 网络，网络名可以配置，默认按 shared-proxy 处理
4. 提供一份给共享 nginx 使用的站点配置片段，例如 conf.d/xxx.conf
5. 站点配置里把请求转发到业务容器名:内部端口
6. 把部署内容打成一个压缩包给我，我会自己上传到服务器解压部署
7. 压缩包里至少包含：
   - docker-compose.yml
   - .env.example
   - nginx 站点配置片段
   - README 部署说明
8. README 里请明确写出：
   - 需要配置的环境变量
   - 需要创建的数据目录和日志目录
   - 需要加入的共享 Docker 网络
   - nginx 配置文件应该复制到哪里
   - 启动、升级、回滚命令

你只需要产出部署压缩包和说明，不需要直接登录服务器操作。
```

如果你想把约束再说得更死一点，可以用这个短版本：

```text
服务器上已有共享 nginx。不要为这个项目再单独部署 nginx，不要占用 80/443。请把业务服务接入 shared-proxy 这类外部 Docker 网络，并额外提供一份 nginx conf.d 配置片段。最后把 docker-compose.yml、.env.example、nginx 配置片段、README 一起打成压缩包给我，我自己上传服务器部署。
```
