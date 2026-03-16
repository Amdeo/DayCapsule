# DayCapsule 后端云同步功能设计文档

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
| 后端框架 | Node.js + Express + TypeScript | 与前端同技术栈，维护成本低 |
| 数据库 | PostgreSQL 15 | 稳定可靠，Docker 生态成熟 |
| 认证 | JWT + bcrypt | 标准方案，无外部依赖 |
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
│  │  │   Nginx     │  │   Express   │  │  PostgreSQL 15 │  │ │
│  │  │  (反向代理)  │  │   API 服务   │  │    + 数据卷     │  │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 数据流设计

### 3.1 同步触发时机
1. **应用启动时** — 检测网络可用后自动检查
2. **数据变更后** — 防抖 5 秒后触发
3. **手动触发** — 用户下拉刷新或点击同步按钮

### 3.2 全量替换流程

```
┌─────────┐     ┌──────────────────────────────────────────────┐     ┌─────────┐
│  客户端  │     │                  同步流程                     │     │  服务端  │
└────┬────┘     └──────────────────────────────────────────────┘     └────┬────┘
     │                                                                    │
     │  1. 计算本地数据 hash + 最新时间戳                                  │
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
     │                                                                    │
     ├────────────────────────────────────────────────────────────────────┤
     │                        分支 C: 冲突处理                             │
     ├────────────────────────────────────────────────────────────────────┤
     │                                                                    │
     │  5C. 本地更新时间 > 云端时，显示冲突解决对话框                         │
     │      选项: [使用本地] [使用云端] [合并(简单追加)]                      │
     │                                                                    │
```

---

## 4. API 规范

### 4.1 认证相关

#### POST /auth/register
注册用户

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "min8chars"
}
```

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

#### POST /sync/upload
上传全量数据

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
  "deviceName": "iPhone 15 Pro"
}
```

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
    "updatedAt": "2026-03-16T10:00:00Z"
  }
}
```

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

-- 设备表（用于多设备管理）
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255) NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 备份数据表
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL,
  data_hash VARCHAR(64) NOT NULL,
  entry_count INTEGER NOT NULL DEFAULT 0,
  device_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_backups_user_id ON backups(user_id);
CREATE INDEX idx_devices_user_id ON devices(user_id);
```

### 5.2 实体关系

```
users ||--o{ devices : has
users ||--o| backups : has_one
```

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
      DATABASE_URL: postgres://${DB_USER:-daycapsule}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-daycapsule}
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-min-32-chars}
      NODE_ENV: production
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs

  nginx:
    image: nginx:alpine
    container_name: daycapsule-nginx
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:80"
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
| `PORT` | 3000 | 对外服务端口 |

---

## 7. 客户端集成

### 7.1 新增模块

```
src/
├── services/
│   └── syncService.ts      # 云端 API 封装
├── store/
│   └── syncStore.ts        # 同步状态管理
├── components/
│   ├── SyncStatusBar.tsx   # 同步状态指示器
│   ├── LoginModal.tsx      # 登录/注册弹窗
│   └── ConflictDialog.tsx  # 冲突解决对话框
└── hooks/
    └── useAutoSync.ts      # 自动同步 Hook
```

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
- 加密密钥由用户设置，服务端不存储
- 数据库连接使用 SSL（如果 PostgreSQL 支持）

### 8.4 访问控制
- Rate Limiting: 每 IP 100 请求/分钟
- CORS: 限制特定域名（可配置）

---

## 9. 与现有功能兼容性

| 功能 | 处理方式 |
|------|---------|
| 本地 SQLite | 保留为主存储，云端为备份 |
| MMKV 设置 | 保留，云同步设置单独存储 |
| 本地导出备份 | 保留，与云端并行 |
| 离线使用 | 完全支持，有网时自动同步 |
| 图片/语音文件 | 仅同步元数据，文件需另行处理（V2）|

---

## 10. 错误处理

### 10.1 客户端错误

| 场景 | 处理 |
|------|------|
| 网络不可用 | 静默失败，记录日志，稍后重试 |
| 认证过期 | 提示重新登录 |
| 同步冲突 | 显示冲突解决对话框 |
| 服务端错误 | 提示"服务器繁忙，请稍后重试" |

### 10.2 服务端错误

```typescript
// 统一错误响应格式
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误信息"
  }
}
```

---

## 11. 监控与日志

### 11.1 服务端日志
- 使用 winston 记录请求日志
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
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── syncController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── models/
│   │   ├── user.ts
│   │   ├── device.ts
│   │   └── backup.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   └── sync.ts
│   ├── services/
│   │   ├── authService.ts
│   │   └── syncService.ts
│   ├── utils/
│   │   ├── hash.ts
│   │   └── logger.ts
│   └── index.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

### B. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-03-16 | 初始版本 |
