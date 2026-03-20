# DayCapsule 后端云同步功能设计文档

> 说明：本文档中的 PostgreSQL 设计已于 2026-03-20 被 [2026-03-20-backend-sqlite-migration-design.md](/Users/cooper/Documents/code/MemoryCapsule/docs/superpowers/specs/2026-03-20-backend-sqlite-migration-design.md) 替代，当前实现以后者为准。

**创建日期**: 2026-03-16
**状态**: 已批准
**版本**: 1.0

---

## 1. 概述

### 1.1 背景
DayCapsule 当前为纯本地应用，使用 SQLite 存储 entries、MMKV 存储设置。用户在更换设备时面临数据迁移困难。

### 1.2 目标
增加自托管后端，实现：
- ✅ 云端自动同步备份
- ✅ 多设备数据迁移
- ✅ 与现有本地功能并存（双轨制）

### 1.3 非目标
- ❌ 实时多设备同步（采用全量替换策略）
- ❌ 社交/分享功能
- ❌ 协作编辑

---

## 2. 技术架构

### 2.1 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| 后端框架 | Go 1.23 + Gin | 高性能、编译型、部署简单、资源占用低 |
| 数据库 | PostgreSQL 15 | 稳定可靠，Docker 生态成熟 |
| 认证 | JWT (golang-jwt) + bcrypt | 标准方案，无外部依赖 |
| 容器编排 | Docker Compose | 用户一键部署 |
| 反向代理 | Nginx | SSL 终止、静态文件服务 |

### 2.2 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户设备 (React Native)                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ SQLite (本地) │    │  MMKV (设置)  │    │  云端同步模块  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┴─────────────────────────────────┐
│                    VPS / 自有服务器                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Docker Compose 编排                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │ │
│  │  │   Nginx     │  │  Go/Gin API │  │  PostgreSQL 15 │  │ │
│  │  │  (反向代理)  │  │   API 服务   │  │    + 数据卷     │  │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 数据流设计

### 3.1 同步触发时机

| 触发条件 | 实现位置 | 具体逻辑 |
|----------|----------|----------|
| **应用启动时** | `syncStore.initialize()` | 网络可用后延迟 2 秒执行首次检查（避免启动卡顿） |
| **数据变更后** | `useAutoSync.ts` Hook | 监听 entryStore 变化，防抖 5 秒后触发同步 |
| **手动触发** | 下拉刷新 / 同步按钮 | 立即执行，跳过防抖 |

**防抖逻辑实现** (`useAutoSync.ts`):
```typescript
// 使用 lodash.debounce 或自定义防抖
const debouncedSync = useMemo(
  () => debounce(() => syncStore.syncIfNeeded(), 5000),
  []
);

// 监听数据变化
useEffect(() => {
  if (syncConfig.enabled && syncConfig.autoSync) {
    debouncedSync();
  }
  // 清理：组件卸载或新的变更时取消之前的防抖
  return () => debouncedSync.cancel();
}, [entries.length, lastModified]);
```

**防抖重置时机**:
- 新的 entry 添加/修改/删除 → 重置 5 秒计时器
- 用户手动触发同步 → 立即执行，取消待执行的防抖
- 网络断开 → 暂停防抖，网络恢复后重新计时
- 应用进入后台 → 取消防抖，前台恢复后重新评估

### 3.2 全量替换流程

```
┌─────────┐     ┌──────────────────────────────────────────────┐     ┌─────────┐
│  客户端  │     │                  同步流程                     │     │  服务端  │
└────┬────┘     └──────────────────────────────────────────────┘     └────┬────┘
     │                                                                    │
     │  1. 计算本地数据 hash + 最新时间戳                                  │
     │     算法: SHA-256(gzip(JSON.stringify(entries)))                   │
     │───────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │  2. GET /sync/status                                               │
     │───────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │  3. 返回云端状态 (hash + 更新时间)                                   │
     │<───────────────────────────────────────────────────────────────────│
     │                                                                    │
     │  4. 比较决定上传/下载/跳过                                          │
     │                                                                    │
     ├────────────────────────────────────────────────────────────────────┤
     │                        分支 A: 需要上传                             │
     ├────────────────────────────────────────────────────────────────────┤
     │                                                                    │
     │  5A. POST /sync/upload (压缩后的全量数据)                            │
     │      压缩: gzip (level 6)                                          │
     │      注意: 仅上传 entries/tags 元数据，图片/语音文件不上传            │
     │───────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │  6A. 存储并返回成功                                                  │
     │<───────────────────────────────────────────────────────────────────│
     │                                                                    │
     ├────────────────────────────────────────────────────────────────────┤
     │                        分支 B: 需要下载                             │
     ├────────────────────────────────────────────────────────────────────┤
     │                                                                    │
     │  5B. GET /sync/download                                              │
     │───────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │  6B. 返回云端备份数据                                                │
     │<───────────────────────────────────────────────────────────────────│
     │                                                                    │
     │  7B. 提示用户确认后替换本地 SQLite                                    │
     │      图片/语音文件处理: 保留本地文件 + 合并云端元数据                  │
     │                                                                    │
     ├────────────────────────────────────────────────────────────────────┤
     │                        分支 C: 冲突处理                             │
     ├────────────────────────────────────────────────────────────────────┤
     │                                                                    │
     │  5C. 本地更新时间 > 云端时                                           │
     │      5C1. GET /sync/status 获取云端概要信息                           │
     │      5C2. 显示冲突对话框，展示对比信息：                               │
     │          - 本地: X 条 entries, 最新修改: Y                             │
     │          - 云端: Z 条 entries, 最新修改: W                             │
     │      5C3. 用户选择:                                                  │
     │          - [使用本地] → POST /sync/upload (强制覆盖云端)               │
     │          - [使用云端] → GET /sync/download (覆盖本地)                  │
     │          - [合并] → 本地追加云端独有 entries, 冲突 entry 取最新         │
     │                                                                    │
```

**数据压缩与 Hash 计算详情**:

| 步骤 | 算法 | 客户端库 | 服务端库 |
|------|------|----------|----------|
| JSON 序列化 | `JSON.stringify` | 原生 | encoding/json |
| 压缩 | `gzip` (level 6) | pako / react-native-gzip | compress/gzip |
| Hash | `SHA-256` | expo-crypto / crypto-js | crypto/sha256 |
| 上传数据 | Base64(gzip(JSON)) | 原生 btoa/atob | encoding/base64 |

### 3.3 图片/语音文件处理策略（V1）

V1 版本**仅同步 entries 和 tags 的元数据**，图片和语音文件**不同步到云端**。

| 场景 | 处理方式 |
|------|---------|
| **上传** | 仅上传 entries JSON（包含图片/语音的文件路径） |
| **下载恢复** | 合并云端 entries 与本地文件系统 |
| **文件缺失** | entry 显示占位符"文件仅在原设备可用" |

**文件路径说明**:
- 云端存储的 `mediaUri` 为本地文件路径（如 `file:///...`）
- 恢复时保留这些路径，但标记为 `isLocalFile: false`
- 如果用户在新设备拍摄同路径文件，自动关联

**V2 计划**: 增加文件同步功能（对象存储或 WebDAV）

---

## 4. API 规范

### 4.1 认证相关

#### POST /auth/register
注册用户

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**密码复杂度要求**:
- 最小长度: 8 字符
- 最大长度: 64 字符
- 必须包含: 至少 1 个大写字母、1 个小写字母、1 个数字
- 可选: 特殊字符增强安全性
- 服务端使用 bcrypt 存储（10轮）

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2026-03-16T10:00:00Z"
    },
    "token": "jwt-token"
  }
}
```

**错误响应**:
- `400 INVALID_REQUEST`: 邮箱格式错误、密码不符合复杂度要求

---

#### POST /auth/login
用户登录

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "min8chars"
}
```

**响应**: 同 register

**错误响应**:
- `400 INVALID_REQUEST`: 邮箱格式错误或密码少于8位
- `401 INVALID_CREDENTIALS`: 邮箱或密码错误

---

#### POST /auth/refresh
刷新访问令牌

**请求头**: `Authorization: Bearer <refresh-token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 604800
  }
}
```

**错误响应**:
- `401 REFRESH_TOKEN_INVALID`: 刷新令牌无效或过期

---

#### GET /auth/me
获取当前用户信息

**请求头**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-03-16T10:00:00Z"
  }
}
```

**错误响应**:
- `401 TOKEN_EXPIRED` / `TOKEN_INVALID`: 认证失败
- `404 USER_NOT_FOUND`: 用户不存在

---

### 4.2 同步相关

#### GET /sync/status
获取云端备份状态

**请求头**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "hasBackup": true,
    "hash": "sha256-hash",
    "entryCount": 150,
    "updatedAt": "2026-03-16T10:00:00Z",
    "deviceName": "iPhone 15 Pro"
  }
}
```

**错误响应**:
- `401 TOKEN_EXPIRED` / `TOKEN_INVALID`: 认证失败

---

#### POST /sync/upload
上传全量数据

**请求体限制**: 最大 50MB（可通过 nginx 配置调整）

**请求头**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**请求体**:
```json
{
  "data": {
    "entries": [...],
    "tags": [...],
    "version": 1
  },
  "hash": "sha256-hash",
  "entryCount": 150,
  "deviceName": "iPhone 15 Pro",
  "encrypted": false,
  "encryptionVersion": 0
}
```

**字段说明**:
- `encrypted`: 数据是否已加密（客户端加密时设为 true）
- `encryptionVersion`: 加密方案版本（0=未加密，1=AES-256-GCM）

**服务端处理加密数据**:
- 服务端不解析 `data` 字段内容，直接存储
- 加密元数据（`encrypted`, `encryptionVersion`）与数据一同存储
- 下载时原样返回，客户端根据 `encrypted` 字段决定是否解密

**响应**:
```json
{
  "success": true,
  "data": {
    "uploadedAt": "2026-03-16T10:00:00Z",
    "hash": "sha256-hash"
  }
}
```

**错误响应**:
- `400 INVALID_REQUEST`: 请求格式错误或数据大小超过限制
- `401 TOKEN_EXPIRED` / `TOKEN_INVALID`: 认证失败

#### GET /sync/download
下载全量数据

**请求头**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "data": {
      "entries": [...],
      "tags": [...],
      "version": 1
    },
    "hash": "sha256-hash",
    "entryCount": 150,
    "encrypted": false,
    "encryptionVersion": 0,
    "updatedAt": "2026-03-16T10:00:00Z"
  }
}
```

**错误响应**:
- `401 TOKEN_EXPIRED` / `TOKEN_INVALID`: 认证失败
- `404 BACKUP_NOT_FOUND`: 云端备份不存在

---

#### DELETE /sync/backup
删除云端备份

**请求头**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "message": "备份已删除"
}
```

**错误响应**:
- `401 TOKEN_EXPIRED` / `TOKEN_INVALID`: 认证失败

---

#### GET /health
健康检查端点

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-03-16T10:00:00Z",
    "database": "connected"
  }
}
```

---

## 5. 数据库设计

### 5.1 Schema

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 备份数据表（V1 版本暂不实现 devices 表，单用户单备份）
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,  -- UNIQUE: 单用户单备份
  data_json TEXT NOT NULL,            -- 加密时存储密文（Base64），解密后为 JSON
  data_hash VARCHAR(64) NOT NULL,     -- 存储客户端提供的 hash（SHA-256 of gzip compressed JSON）
  entry_count INTEGER NOT NULL DEFAULT 0,
  device_name VARCHAR(255),
  encrypted BOOLEAN DEFAULT FALSE,    -- 数据是否加密
  encryption_version INTEGER DEFAULT 0, -- 加密方案版本
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_backups_user_id ON backups(user_id);
-- CREATE INDEX idx_devices_user_id ON devices(user_id);  -- V2 多设备管理时启用
```

### 5.2 实体关系

```
users ||--o| backups : has_one
```

**说明**: V1 版本简化为用户-备份一对一关系。`deviceName` 字段存储在 backups 表中仅用于展示。

---

## 6. Docker Compose 配置

### 6.1 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: daycapsule-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-daycapsule}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
      POSTGRES_DB: ${DB_NAME:-daycapsule}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-daycapsule} -d ${DB_NAME:-daycapsule}"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: daycapsule-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://${DB_USER:-daycapsule}:${DB_PASSWORD:-changeme}@postgres:5432/${DB_NAME:-daycapsule}
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-min-32-chars}
      ENV: production
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs  # 需要手动创建 logs 目录

  nginx:
    image: nginx:alpine
    container_name: daycapsule-nginx
    restart: unless-stopped
    ports:
      - "${PORT:-8080}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api

volumes:
  postgres_data:
```

### 6.2 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DB_USER` | daycapsule | PostgreSQL 用户名 |
| `DB_PASSWORD` | changeme | **必须修改** |
| `DB_NAME` | daycapsule | 数据库名 |
| `JWT_SECRET` | - | **必须设置**，至少 32 字符 |
| `PORT` | 8080 | 对外服务端口（避免与 API 内部端口冲突） |

### 6.3 数据库迁移策略

后端使用 **golang-migrate** 管理 PostgreSQL schema 迁移：

**迁移命令**:
```bash
# 本地开发
migrate -path migrations -database "postgres://user:pass@localhost:5432/db?sslmode=disable" up

# 容器内（Dockerfile CMD 中）
migrate -path /app/migrations -database "$DATABASE_URL" up
```

**迁移文件命名**: `migrations/YYYYMMDDHHMMSS_<name>.up.sql` / `.down.sql`

**容器启动时自动迁移**:
```dockerfile
# backend/Dockerfile
# migrate/migrate 是官方镜像，需要 Docker BuildKit（Docker 18.09+ 默认启用）
COPY --from=migrate/migrate /usr/local/bin/migrate /usr/local/bin/
CMD migrate -path /app/migrations -database "$DATABASE_URL" up && /app/server
```

**迁移失败处理策略**:
- **迁移成功 (exit 0)**: 继续启动应用
- **已是最新 (exit 0)**: 继续启动应用
- **连接失败 (exit 1)**: 容器退出，Docker 会根据 restart 策略重试
- **迁移错误 (exit 2+)**: 容器退出，需要人工检查迁移脚本

**启动顺序**: postgres → api 等待 healthy → 执行迁移 → 启动服务

**初始迁移文件** (`migrations/20260316000000_initial_schema.up.sql`) 包含第 5 节定义的 schema。

**go.mod 示例**:
```go
module github.com/daycapsule/backend

go 1.23

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/lib/pq v1.10.9
	go.uber.org/zap v1.26.0
	golang.org/x/crypto v0.18.0
)
```

---

### 6.4 nginx.conf

**基础配置（HTTP）**:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    keepalive_timeout 65;

    # Gzip compression
    gzip on;
    gzip_types application/json;

    upstream api {
        server api:3000;
    }

    server {
        listen 80;
        server_name _;

        # Health check (no auth required)
        location /health {
            proxy_pass http://api/health;
            proxy_http_version 1.1;
        }

        # API routes
        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Increase body size for upload endpoint (50MB)
            client_max_body_size 50M;

            # Timeout settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
```

**HTTPS 配置（生产环境）**:
```nginx
# 方式 1: 使用 Let's Encrypt 证书
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://api;
        # ... 其他配置同 HTTP 版本
    }
}

# 方式 2: 使用反向代理（如已有 Nginx/CDN 处理 SSL）
# 保留上方 HTTP 配置，在上一层 Nginx 处理 HTTPS
```

**证书获取（Let's Encrypt）**:
```bash
# 使用 certbot
certbot certonly --standalone -d your-domain.com
# 证书路径: /etc/letsencrypt/live/your-domain.com/
```

---

### 6.5 部署步骤

```bash
# 1. 创建目录并进入
mkdir daycapsule-server && cd daycapsule-server

# 2. 创建环境变量文件
cat > .env << 'EOF'
DB_USER=daycapsule
DB_PASSWORD=your-secure-password
DB_NAME=daycapsule
JWT_SECRET=your-jwt-secret-min-32-characters
PORT=8080
EOF

# 3. 创建 nginx.conf (从上方复制)
# 4. 创建 docker-compose.yml (从上方复制)
# 5. 创建 backend/ 目录结构和 Dockerfile (从附录 A 复制)
# 6. 创建日志目录
mkdir logs

# 7. 启动服务
docker-compose up -d

# 8. 检查状态
curl http://localhost:8080/health
```

---

### 6.6 backend/Dockerfile

**多阶段构建**:

```dockerfile
# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Final stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy migrate tool
COPY --from=migrate/migrate /usr/local/bin/migrate /usr/local/bin/

# Copy binary and migrations
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run migrations and start
CMD migrate -path /app/migrations -database "$DATABASE_URL" up && ./server
```

---

## 7. 客户端集成

### 7.1 新增模块

**项目根目录结构**:
```
MemoryCapsule/
├── app/                    # React Native 应用代码
│   └── src/
│       ├── services/
│       │   └── syncService.ts      # 云端 API 封装
│       ├── store/
│       │   └── syncStore.ts        # 同步状态管理
│       ├── components/
│       │   ├── SyncStatusBar.tsx   # 同步状态指示器
│       │   ├── LoginModal.tsx      # 登录/注册弹窗
│       │   └── ConflictDialog.tsx  # 冲突解决对话框
│       └── hooks/
│           └── useAutoSync.ts      # 自动同步 Hook
│
└── backend/                # 后端服务（与 app/ 同级，独立目录）
    ├── cmd/server/
    ├── internal/
    ├── migrations/
    ├── pkg/
    ├── Dockerfile
    ├── go.mod
    └── go.sum
```

**说明**:
- 前端代码在 `app/src/` 下（按 CLAUDE.md，命令在 `app/` 目录执行）
- 后端代码在 `backend/` 下（独立目录，不依赖 app/ 内的代码）

### 7.2 同步策略配置

```typescript
interface SyncConfig {
  enabled: boolean;           // 是否启用云同步
  autoSync: boolean;          // 是否自动同步
  autoSyncInterval: number;   // 自动同步间隔（分钟）
  wifiOnly: boolean;          // 是否仅 WiFi 下同步
  encryptData: boolean;       // 是否加密云端数据
}
```

### 7.3 冲突解决策略

当本地更新时间 > 云端更新时间时：

1. **提示用户** — 显示冲突对话框
2. **提供选项**:
   - 📱 使用本地（覆盖云端）
   - ☁️ 使用云端（覆盖本地）
   - 🔀 合并（简单追加，去重）

### 7.4 合并去重逻辑

**合并策略**（当用户选择"合并"时执行）：

```typescript
// 去重逻辑
const mergeEntries = (localEntries: Entry[], cloudEntries: Entry[]): Entry[] => {
  const entryMap = new Map<string, Entry>();

  // 1. 先添加所有本地 entries
  localEntries.forEach(entry => {
    entryMap.set(entry.id, entry);
  });

  // 2. 处理云端 entries
  cloudEntries.forEach(cloudEntry => {
    const localEntry = entryMap.get(cloudEntry.id);

    if (!localEntry) {
      // 本地没有，直接添加
      entryMap.set(cloudEntry.id, { ...cloudEntry, isLocalFile: false });
    } else {
      // 冲突：同一 entry 存在于两端
      // 策略：取 updatedAt 更新的
      if (new Date(cloudEntry.updatedAt) > new Date(localEntry.updatedAt)) {
        // 保留云端版本，但标记文件可能缺失
        entryMap.set(cloudEntry.id, {
          ...cloudEntry,
          isLocalFile: false // 云端版本可能没有本地文件
        });
      }
      // 否则保留本地版本（已存在 map 中）
    }
  });

  // 3. 转换为数组，按时间戳排序
  return Array.from(entryMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
```

**去重键**: `entry.id`（UUID，全局唯一）

**文件处理**:
- 合并后，标记 `isLocalFile: false` 的 entries 需要重新关联本地文件或显示占位符

---

## 8. 安全设计

### 8.1 传输安全
- HTTPS 强制（Nginx 层配置）
- HSTS 头部
- 证书自动续期（Let's Encrypt）

### 8.2 认证安全
- 密码: bcrypt 10轮哈希
- JWT: HS256 算法，7天有效期
- 刷新令牌: 30天有效期

### 8.3 数据安全
- 云端数据可选 AES-256-GCM 加密
- 加密密钥由用户设置，**服务端不存储**
- 多设备密钥同步：用户需在新设备输入相同密钥（可设计为设置密码短语）
- 数据库连接使用 SSL（如果 PostgreSQL 支持）

**密钥管理方案（V1 简化版）**:

1. **密码短语输入**: 用户在设置中开启加密，输入 8-32 字符密码短语
2. **密钥派生**: 使用 PBKDF2-HMAC-SHA256
   - 迭代次数: 100,000
   - 盐值: 随机 16 字节，与加密数据一起存储
   - 输出: 256-bit (32 字节) 密钥
   - **客户端库**: `expo-crypto` 或 `react-native-crypto`
3. **数据加密**: 使用 AES-256-GCM
   - IV: 随机 12 字节
   - 认证标签: 128-bit
   - 密文格式: Base64(盐值 + IV + 密文 + 认证标签)
   - **客户端库**: `expo-crypto` 或 `react-native-aes-crypto`
4. **密钥存储**:
   - 推荐库: `react-native-keychain` v9+
     - 与 custom dev client 兼容（项目不使用 Expo Go）
     - 支持 iOS Keychain 和 Android Keystore
   - 备选: `expo-secure-store`（如果迁移到 Expo SDK 内置方案）
   - 绝不存储在 MMKV 或 AsyncStorage

**客户端加密库选择**:

| 库 | 用途 | 推荐度 | 备注 |
|----|------|--------|------|
| `expo-crypto` | PBKDF2, SHA256 | ⭐⭐⭐ | Expo 官方，支持 custom dev client |
| `react-native-aes-crypto` | AES-GCM | ⭐⭐⭐ | 原生性能，支持 custom dev client |
| `react-native-keychain` | 密钥存储 | ⭐⭐⭐ | 标准安全存储方案 |
5. **多设备同步**: 新设备恢复时，用户需手动输入相同密码短语才能解密

### 8.4 访问控制
- Rate Limiting: 每 IP 100 请求/分钟
- CORS: 限制特定域名（可配置）

---

## 9. 与现有功能兼容性

| 功能 | 处理方式 |
|------|---------|
| 本地 SQLite | 保留为主存储，云端为备份 |
| MMKV 设置 | 保留，云同步设置单独存储在 `sync-settings` namespace |
| 本地导出备份 | 保留，与云端并行 |
| 离线使用 | 完全支持，有网时自动同步 |
| 图片/语音文件 | 仅同步元数据，文件需另行处理（V2）|

---

## 10. 错误处理

### 10.1 客户端错误

| 场景 | 处理 | 重试策略 |
|------|------|----------|
| 网络不可用 | 静默失败，记录日志 | 网络恢复后自动重试（NetInfo 监听） |
| 请求超时 | 静默失败 | 立即重试 1 次，仍失败则等待下次触发 |
| 服务端 5xx | 静默失败 | 指数退避：1s, 2s, 4s, 8s, 16s（最多 5 次）|
| 认证过期 | 提示重新登录 | 不重试，等待用户操作 |
| 同步冲突 | 显示冲突解决对话框 | 不重试，等待用户决策 |
| 速率限制 (429) | 静默失败 | 等待 60 秒后重试 |

**指数退避实现**:
```typescript
const retryWithBackoff = async (
  fn: () => Promise<void>,
  maxRetries = 5,
  baseDelay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // 指数退避 + 随机抖动（避免惊群效应）
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      await sleep(delay);
    }
  }
};
```

### 10.2 服务端错误响应格式

**统一错误响应结构**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误信息"
  }
}
```

### 10.3 服务端错误码枚举

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `INVALID_REQUEST` | 400 | 请求参数无效 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `TOKEN_EXPIRED` | 401 | 访问令牌已过期 |
| `TOKEN_INVALID` | 401 | 访问令牌无效 |
| `REFRESH_TOKEN_INVALID` | 401 | 刷新令牌无效 |
| `FORBIDDEN` | 403 | 无权访问该资源 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `BACKUP_NOT_FOUND` | 404 | 云端备份不存在 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |

---

## 11. 监控与日志

### 11.1 服务端日志
- 使用 zap 或 slog 记录结构化日志
- 日志文件挂载到宿主机
- 保留 30 天日志

### 11.2 关键指标
- 日活跃用户（DAU）
- 同步成功率
- API 响应时间
- 错误率

---

## 12. 未来扩展

| 功能 | 说明 |
|------|------|
| 增量同步 | 仅传输变更数据，减少流量 |
| 文件同步 | 图片/语音文件云端存储 |
| 端到端加密 | 零知识架构，服务端无法解密 |
| 多设备实时同步 | WebSocket 推送变更 |
| 共享空间 | 家庭/团队共享 entries |

---

## 附录

### A. 目录结构

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # 入口
├── internal/
│   ├── config/               # 配置
│   │   ├── config.go
│   │   └── database.go
│   ├── handlers/             # HTTP handlers
│   │   ├── auth.go
│   │   └── sync.go
│   ├── middleware/           # 中间件
│   │   ├── auth.go
│   │   ├── error.go
│   │   └── ratelimit.go
│   ├── models/               # 数据模型
│   │   ├── user.go
│   │   └── backup.go         # device.go V2 启用
│   ├── repository/           # 数据访问层
│   │   ├── user_repo.go
│   │   └── backup_repo.go
│   └── service/              # 业务逻辑层
│       ├── auth_service.go
│       └── sync_service.go
├── migrations/               # golang-migrate 迁移文件
│   ├── 20260316000000_initial_schema.up.sql
│   └── 20260316000000_initial_schema.down.sql
├── pkg/
│   └── utils/                # 工具包
│       ├── hash.go
│       └── logger.go
├── go.mod
├── go.sum
└── Dockerfile
```

### B. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.6 | 2026-03-16 | 第四轮审查修复：添加迁移失败处理、客户端库推荐、HTTPS配置、密码复杂度、防抖逻辑、重试策略、合并去重逻辑 |
| 1.5 | 2026-03-16 | Go 版本审查修复：更新架构图、环境变量、客户端库说明、go.mod 示例 |
| 1.4 | 2026-03-16 | 技术栈变更：Node.js → Go 1.23 + Gin，更新目录结构、Dockerfile、迁移工具 |
| 1.3 | 2026-03-16 | 第三轮审查修复：添加 Dockerfile、数据库迁移策略、压缩算法说明、密钥派生细节、唯一约束、修复部署步骤 |
| 1.2 | 2026-03-16 | 第二轮审查修复：修复 API 结构、添加错误响应、修复 data_json 类型、添加 nginx.conf、明确目录结构、完善密钥管理、添加文件处理策略 |
| 1.1 | 2026-03-16 | 第一轮审查修复：添加加密协议、刷新令牌API、错误码枚举、health端点、修复端口冲突 |
| 1.0 | 2026-03-16 | 初始版本 |
