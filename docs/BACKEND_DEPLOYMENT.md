# MemoryCapsule 后端部署文档

## 目标

这份文档只覆盖仓库内 `backend/` 的部署。

当前后端技术栈与运行方式：

- Go + Gin
- SQLite 单文件数据库
- 本地磁盘存储上传文件
- `docker compose` 编排
- 内置 Nginx 反向代理到 API 容器

## 推荐方案

当前仓库最适合的上线方式是：

`单台 Linux VPS + Docker Compose + 挂载本地磁盘`

原因很直接：

- 仓库已经提供了 [`docker-compose.yml`](/Users/cooper/Documents/code/MemoryCapsule/docker-compose.yml)、[`nginx.conf`](/Users/cooper/Documents/code/MemoryCapsule/nginx.conf) 和 [`backend/Dockerfile`](/Users/cooper/Documents/code/MemoryCapsule/backend/Dockerfile)
- 数据库是 SQLite，天然更适合单机部署
- 上传文件也落在本地磁盘，和 SQLite 一起备份最简单
- 不需要先引入 Kubernetes、对象存储、外部数据库这些额外复杂度

如果只是内测或小规模使用，这个方案已经够用。

## 部署前提

建议环境：

- Ubuntu 22.04 / Debian 12
- 1 vCPU / 1 GB RAM 起步
- 20 GB 以上磁盘
- 已安装 Docker 和 Docker Compose Plugin

安装 Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 需要的环境变量

后端实际读取的关键环境变量定义在 [`backend/internal/config/config.go`](/Users/cooper/Documents/code/MemoryCapsule/backend/internal/config/config.go)。

最少需要配置：

- `JWT_SECRET`
- `BASE_URL`

常用变量说明：

| 变量 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `JWT_SECRET` | 是 | 无 | JWT 签名密钥，必须至少 32 位随机字符串 |
| `BASE_URL` | 强烈建议 | `http://localhost:8080` | 后端对外访问地址，用于拼接媒体 URL |
| `PORT` | 否 | `8080` | 宿主机暴露端口，由 `docker-compose.yml` 使用 |
| `DATABASE_PATH` | 否 | `/app/data/daycapsule.db` | SQLite 文件路径 |
| `JWT_EXPIRY` | 否 | `168` | Access Token 过期时间，单位小时 |
| `REFRESH_EXPIRY` | 否 | `720` | Refresh Token 过期时间，单位小时 |

## 5 分钟快速部署

### 1. 拉代码

```bash
git clone <your-repo-url> MemoryCapsule
cd MemoryCapsule
```

### 2. 复制根目录环境变量模板

`docker compose` 会自动读取仓库根目录的 `.env`。

```bash
cp .env.example .env
```

然后编辑 `.env`，至少确认这几个值：

```env
PORT=8080
JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
BASE_URL=http://YOUR_SERVER_IP:8080
DATABASE_PATH=/app/data/daycapsule.db
```

如果你已经有域名，并且外层已经接了 HTTPS 反代，把 `BASE_URL` 改成正式地址，例如 `https://api.example.com`。

### 3. 启动服务

```bash
mkdir -p logs backend/data
docker compose up -d --build
```

### 4. 检查状态

```bash
docker compose ps
docker compose logs api --tail=100
curl http://127.0.0.1:8080/health
```

健康检查成功时，接口会返回 `status=healthy`。对应处理逻辑在 [`backend/internal/handlers/health.go`](/Users/cooper/Documents/code/MemoryCapsule/backend/internal/handlers/health.go)。

### 5. 客户端接入

App 端需要把 API 地址指向后端：

```env
EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:8080/api
```

对应读取逻辑在 [`app/src/services/apiClient.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/apiClient.ts)。

## 当前 Compose 架构

请求链路如下：

```text
Client -> Host:8080 -> nginx container:80 -> api container:3000
```

容器职责：

- `api`
  - 构建自 `backend/Dockerfile`
  - 运行 Go 服务
  - 挂载 `./backend/data:/app/data`
  - 挂载 `./logs:/app/logs`
- `nginx`
  - 对外暴露端口
  - 把 `/` 和 `/health` 转发给 `api`

相关文件：

- [`docker-compose.yml`](/Users/cooper/Documents/code/MemoryCapsule/docker-compose.yml)
- [`nginx.conf`](/Users/cooper/Documents/code/MemoryCapsule/nginx.conf)
- [`backend/Dockerfile`](/Users/cooper/Documents/code/MemoryCapsule/backend/Dockerfile)

## 生产环境建议

### 1. 优先使用 HTTPS

如果给真实用户使用，不建议直接暴露 `http://IP:8080`。

更稳妥的方式：

- 域名指向服务器
- 在服务器外层用云负载均衡、Caddy 或宿主机 Nginx 做 TLS 终止
- 反向代理到 `127.0.0.1:8080`
- `BASE_URL` 和 `EXPO_PUBLIC_API_URL` 都改成 `https://...`

### 2. 收紧安全组

至少只开放：

- `22` SSH
- `80/443` 如果你做 HTTPS
- 如果只是临时内测，才开放 `8080`

### 3. 数据目录单独备份

当前数据库和上传文件都在：

- [`backend/data`](/Users/cooper/Documents/code/MemoryCapsule/backend/data)

其中通常会包含：

- `daycapsule.db`
- `uploads/`

这是最关键的数据目录。

### 4. 不要做多副本

当前实现基于 SQLite + 本地文件：

- 不适合横向扩容多个 API 副本
- 不适合多节点共享写入

如果以后要多实例部署，建议再演进到：

- Postgres
- 对象存储
- 独立媒体服务或 CDN

## 备份与恢复

### 备份

```bash
tar czf backup-$(date +%F-%H%M%S).tar.gz backend/data
```

### 恢复

```bash
docker compose down
tar xzf backup-2026-03-23-120000.tar.gz
docker compose up -d
```

如果只想备份数据库文件，也可以直接备份：

```bash
cp backend/data/daycapsule.db backend/data/daycapsule.db.bak
```

## 升级流程

```bash
git pull
docker compose up -d --build
docker compose logs api --tail=100
```

因为数据库是挂载目录，正常重建容器不会丢数据。

## 回滚流程

最简单的回滚方式是两步：

1. 回到旧代码版本
2. 重新 `docker compose up -d --build`

如果升级后数据结构或文件异常，再配合恢复 `backend/data` 备份。

## 常用运维命令

查看容器状态：

```bash
docker compose ps
```

查看 API 日志：

```bash
docker compose logs -f api
```

查看 Nginx 日志：

```bash
docker compose logs -f nginx
```

重启服务：

```bash
docker compose restart
```

停止服务：

```bash
docker compose down
```

## 手动部署方案（非 Docker）

如果你不想用 Docker，也可以直接在 Linux 上跑二进制，但这不是首选，因为你还需要自己维护进程守护和反向代理。

### 1. 构建后端

```bash
cd backend
go build -o server ./cmd/server
```

### 2. 准备环境变量

```bash
export PORT=3000
export JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
export DATABASE_PATH=/srv/daycapsule/data/daycapsule.db
export UPLOAD_DIR=/srv/daycapsule/data/uploads
export BASE_URL=https://api.example.com
export ENV=production
```

### 3. 启动服务

```bash
./server
```

### 4. 用 systemd 托管

可以创建 `/etc/systemd/system/daycapsule.service`，再由宿主机 Nginx 代理到 `127.0.0.1:3000`。

这个方案能用，但维护成本高于 Docker Compose。

## 故障排查

### 服务起不来

优先检查：

- `JWT_SECRET` 是否缺失
- `backend/data` 是否可写
- `docker compose logs api`

后端在启动时会强校验 `JWT_SECRET`，逻辑见 [`backend/cmd/server/main.go`](/Users/cooper/Documents/code/MemoryCapsule/backend/cmd/server/main.go)。

### `/health` 正常，但接口访问失败

优先检查：

- 客户端是否请求了正确的 `/api` 前缀
- `EXPO_PUBLIC_API_URL` 是否配置正确
- 反向代理是否把请求转发到了 `api`

### 媒体文件访问失败

优先检查：

- `BASE_URL` 是否正确
- `backend/data/uploads` 是否存在文件
- 上传目录挂载是否正常

媒体 URL 的拼接逻辑在 [`backend/internal/service/entry_service.go`](/Users/cooper/Documents/code/MemoryCapsule/backend/internal/service/entry_service.go)。

## 一句话结论

如果你现在要最快把后端跑起来，直接用仓库自带的 Compose：

```bash
cp .env.example .env
# 编辑 .env，至少设置 JWT_SECRET 和 BASE_URL
docker compose up -d --build
```

但正式给移动端真机使用时，建议补上域名和 HTTPS，再把客户端 `EXPO_PUBLIC_API_URL` 指到正式地址。
