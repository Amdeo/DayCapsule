# DayCapsule 后端云同步功能实施计划

> 说明：本文档中的 PostgreSQL 实施计划已于 2026-03-20 被 [2026-03-20-backend-sqlite-migration.md](/Users/cooper/Documents/code/MemoryCapsule/docs/superpowers/plans/2026-03-20-backend-sqlite-migration.md) 替代，当前实现以后者为准。

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 DayCapsule 后端云同步功能，包括 Go 后端服务、PostgreSQL 数据库、Docker 部署和客户端集成

**Architecture:**
- 后端采用 Go 1.23 + Gin 框架，分层架构（handlers → service → repository → models）
- PostgreSQL 存储用户和备份数据，golang-migrate 管理 schema
- Docker Compose 一键部署，Nginx 反向代理
- 客户端增量集成，保持现有本地存储为主

**Tech Stack:** Go 1.23, Gin, PostgreSQL 15, golang-migrate, Docker Compose, Nginx, JWT, bcrypt

---

## 文件结构规划

### 后端目录 (`backend/`)
```
backend/
├── cmd/server/main.go          # 入口
├── internal/
│   ├── config/
│   │   ├── config.go           # 环境变量配置
│   │   └── database.go         # 数据库连接
│   ├── handlers/
│   │   ├── auth.go             # 认证 handler
│   │   ├── sync.go             # 同步 handler
│   │   └── health.go           # 健康检查 handler
│   ├── middleware/
│   │   ├── auth.go             # JWT 认证中间件
│   │   ├── error.go            # 错误处理中间件
│   │   └── ratelimit.go        # 限流中间件
│   ├── models/
│   │   ├── user.go             # 用户模型
│   │   └── backup.go           # 备份模型
│   ├── repository/
│   │   ├── user_repo.go        # 用户数据访问
│   │   └── backup_repo.go      # 备份数据访问
│   └── service/
│       ├── auth_service.go     # 认证业务逻辑
│       └── sync_service.go     # 同步业务逻辑
├── pkg/
│   └── utils/
│       ├── hash.go             # 哈希工具
│       ├── jwt.go              # JWT 工具
│       └── logger.go           # 日志工具
├── migrations/
│   ├── 001_initial_schema.up.sql
│   └── 001_initial_schema.down.sql
├── go.mod
├── go.sum
└── Dockerfile
```

### 部署配置（项目根目录）
```
├── docker-compose.yml          # Docker Compose 配置
├── nginx.conf                  # Nginx 配置
└── .env.example                # 环境变量示例
```

### 客户端集成 (`app/src/`)
```
app/src/
├── services/
│   └── syncService.ts          # 云端 API 封装
├── store/
│   └── syncStore.ts            # 同步状态管理
├── components/
│   ├── SyncStatusBar.tsx       # 同步状态指示器
│   ├── LoginModal.tsx          # 登录/注册弹窗
│   └── ConflictDialog.tsx      # 冲突解决对话框
└── hooks/
    └── useAutoSync.ts          # 自动同步 Hook
```

---

## Chunk 1: 后端基础设施

### Task 1: 初始化 Go 模块

**Files:**
- Create: `backend/go.mod`
- Create: `backend/go.sum`

- [ ] **Step 1: 初始化 Go 模块**

```bash
cd backend
go mod init github.com/daycapsule/backend
go get github.com/gin-gonic/gin@v1.9.1
go get github.com/golang-jwt/jwt/v5@v5.2.0
go get github.com/lib/pq@v1.10.9
go get go.uber.org/zap@v1.26.0
go get golang.org/x/crypto@v0.18.0
go get github.com/joho/godotenv@v1.5.1
```

- [ ] **Step 2: Commit**

```bash
git add backend/go.mod backend/go.sum
git commit -m "chore(backend): initialize Go module with dependencies"
```

---

### Task 2: 配置文件和数据库连接

**Files:**
- Create: `backend/internal/config/config.go`
- Create: `backend/internal/config/database.go`

- [ ] **Step 1: 编写配置模块**

`backend/internal/config/config.go`:
```go
package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   int // hours
	RefreshExpiry int // hours
}

func Load() *Config {
	// Load .env file if exists (development)
	_ = godotenv.Load()

	return &Config{
		Port:        getEnv("PORT", "3000"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", ""),
		JWTExpiry:   getEnvAsInt("JWT_EXPIRY", 168), // 7 days
		RefreshExpiry: getEnvAsInt("REFRESH_EXPIRY", 720), // 30 days
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
```

- [ ] **Step 2: 编写数据库连接**

`backend/internal/config/database.go`:
```go
package config

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

func NewDB(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/config/
git commit -m "feat(backend): add config and database connection"
```

---

### Task 3: 数据模型定义

**Files:**
- Create: `backend/internal/models/user.go`
- Create: `backend/internal/models/backup.go`

- [ ] **Step 1: 编写用户模型**

`backend/internal/models/user.go`:
```go
package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // never expose
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type UserRegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=64"`
}

type UserLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}
```

- [ ] **Step 2: 编写备份模型**

`backend/internal/models/backup.go`:
```go
package models

import "time"

type Backup struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	DataJSON          string    `json:"-"` // raw data, not exposed in JSON
	DataHash          string    `json:"dataHash"`
	EntryCount        int       `json:"entryCount"`
	DeviceName        string    `json:"deviceName"`
	Encrypted         bool      `json:"encrypted"`
	EncryptionVersion int       `json:"encryptionVersion"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type BackupData struct {
	Entries []map[string]interface{} `json:"entries"`
	Tags    []map[string]interface{} `json:"tags"`
	Version int                      `json:"version"`
}

type UploadRequest struct {
	Data              BackupData `json:"data" binding:"required"`
	Hash              string     `json:"hash" binding:"required"`
	EntryCount        int        `json:"entryCount"`
	DeviceName        string     `json:"deviceName"`
	Encrypted         bool       `json:"encrypted"`
	EncryptionVersion int        `json:"encryptionVersion"`
}

type BackupStatusResponse struct {
	HasBackup         bool      `json:"hasBackup"`
	Hash              string    `json:"hash"`
	EntryCount        int       `json:"entryCount"`
	UpdatedAt         time.Time `json:"updatedAt"`
	DeviceName        string    `json:"deviceName"`
	Encrypted         bool      `json:"encrypted"`
	EncryptionVersion int       `json:"encryptionVersion"`
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/models/
git commit -m "feat(backend): add user and backup models"
```

---

### Task 4: 数据库迁移文件

**Files:**
- Create: `backend/migrations/001_initial_schema.up.sql`
- Create: `backend/migrations/001_initial_schema.down.sql`

- [ ] **Step 1: 编写迁移文件 (up)**

`backend/migrations/001_initial_schema.up.sql`:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backups table (one per user)
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    data_json TEXT NOT NULL,
    data_hash VARCHAR(64) NOT NULL,
    entry_count INTEGER NOT NULL DEFAULT 0,
    device_name VARCHAR(255),
    encrypted BOOLEAN DEFAULT FALSE,
    encryption_version INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_backups_user_id ON backups(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backups_updated_at BEFORE UPDATE ON backups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: 编写迁移文件 (down)**

`backend/migrations/001_initial_schema.down.sql`:
```sql
DROP TRIGGER IF EXISTS update_backups_updated_at ON backups;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS backups;
DROP TABLE IF EXISTS users;

DROP EXTENSION IF EXISTS "uuid-ossp";
```

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/
git commit -m "feat(backend): add initial database migrations"
```

---

### Task 5: 工具函数

**Files:**
- Create: `backend/pkg/utils/hash.go`
- Create: `backend/pkg/utils/jwt.go`
- Create: `backend/pkg/utils/logger.go`

- [ ] **Step 1: 编写哈希工具**

`backend/pkg/utils/hash.go`:
```go
package utils

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

// CheckPasswordHash compares a password with a hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
```

- [ ] **Step 2: 编写 JWT 工具**

`backend/pkg/utils/jwt.go`:
```go
package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Type   string `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

func GenerateToken(userID, email string, expiryHours int, jwtSecret, tokenType string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Type:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func ParseToken(tokenString string, jwtSecret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
```

- [ ] **Step 3: 编写日志工具**

`backend/pkg/utils/logger.go`:
```go
package utils

import (
	"go.uber.org/zap"
)

var logger *zap.Logger

func InitLogger() error {
	var err error
	logger, err = zap.NewProduction()
	return err
}

func GetLogger() *zap.Logger {
	if logger == nil {
		logger, _ = zap.NewProduction()
	}
	return logger
}

func Sync() {
	if logger != nil {
		_ = logger.Sync()
	}
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/pkg/
git commit -m "feat(backend): add hash, jwt and logger utilities"
```

---

## Chunk 2: 后端业务逻辑

### Task 6: 数据访问层 (Repository)

**Files:**
- Create: `backend/internal/repository/user_repo.go`
- Create: `backend/internal/repository/backup_repo.go`

- [ ] **Step 1: 编写用户 Repository**

`backend/internal/repository/user_repo.go`:
```go
package repository

import (
	"database/sql"
	"errors"

	"github.com/daycapsule/backend/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(email, passwordHash string) (*models.User, error) {
	user := &models.User{}
	query := `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, created_at, updated_at
	`
	err := r.db.QueryRow(query, email, passwordHash).Scan(
		&user.ID, &user.Email, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByID(id string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}
```

- [ ] **Step 2: 编写备份 Repository**

`backend/internal/repository/backup_repo.go`:
```go
package repository

import (
	"database/sql"
	"errors"

	"github.com/daycapsule/backend/internal/models"
)

type BackupRepository struct {
	db *sql.DB
}

func NewBackupRepository(db *sql.DB) *BackupRepository {
	return &BackupRepository{db: db}
}

func (r *BackupRepository) GetByUserID(userID string) (*models.Backup, error) {
	backup := &models.Backup{}
	query := `
		SELECT id, user_id, data_hash, entry_count, device_name,
		       encrypted, encryption_version, created_at, updated_at
		FROM backups
		WHERE user_id = $1
	`
	err := r.db.QueryRow(query, userID).Scan(
		&backup.ID, &backup.UserID, &backup.DataHash, &backup.EntryCount,
		&backup.DeviceName, &backup.Encrypted, &backup.EncryptionVersion,
		&backup.CreatedAt, &backup.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return backup, nil
}

func (r *BackupRepository) Upsert(backup *models.Backup) error {
	query := `
		INSERT INTO backups (user_id, data_json, data_hash, entry_count, device_name, encrypted, encryption_version)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE SET
			data_json = EXCLUDED.data_json,
			data_hash = EXCLUDED.data_hash,
			entry_count = EXCLUDED.entry_count,
			device_name = EXCLUDED.device_name,
			encrypted = EXCLUDED.encrypted,
			encryption_version = EXCLUDED.encryption_version,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(query,
		backup.UserID, backup.DataJSON, backup.DataHash, backup.EntryCount,
		backup.DeviceName, backup.Encrypted, backup.EncryptionVersion,
	).Scan(&backup.ID, &backup.CreatedAt, &backup.UpdatedAt)
}

func (r *BackupRepository) Delete(userID string) error {
	query := `DELETE FROM backups WHERE user_id = $1`
	_, err := r.db.Exec(query, userID)
	return err
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/
git commit -m "feat(backend): add user and backup repositories"
```

---

### Task 7: 认证服务

**Files:**
- Create: `backend/internal/service/auth_service.go`

- [ ] **Step 1: 编写认证服务**

`backend/internal/service/auth_service.go`:
```go
package service

import (
	"errors"
	"regexp"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
	"github.com/daycapsule/backend/pkg/utils"
)

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret string
	jwtExpiry int
	refreshExpiry int
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, jwtExpiry, refreshExpiry int) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		jwtSecret:     jwtSecret,
		jwtExpiry:     jwtExpiry,
		refreshExpiry: refreshExpiry,
	}
}

func (s *AuthService) validatePassword(password string) error {
	if len(password) < 8 || len(password) > 64 {
		return errors.New("password must be between 8 and 64 characters")
	}

	// Check for at least one uppercase, one lowercase, and one digit
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("password must contain at least one uppercase letter, one lowercase letter, and one digit")
	}

	return nil
}

func (s *AuthService) Register(email, password string) (*models.User, string, string, error) {
	// Validate password
	if err := s.validatePassword(password); err != nil {
		return nil, "", "", err
	}

	// Check if user exists
	existingUser, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, "", "", err
	}
	if existingUser != nil {
		return nil, "", "", errors.New("email already registered")
	}

	// Hash password
	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, "", "", err
	}

	// Create user
	user, err := s.userRepo.Create(email, hash)
	if err != nil {
		return nil, "", "", err
	}

	// Generate tokens
	accessToken, err := utils.GenerateToken(user.ID, user.Email, s.jwtExpiry, s.jwtSecret, "access")
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := utils.GenerateToken(user.ID, user.Email, s.refreshExpiry, s.jwtSecret, "refresh")
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

func (s *AuthService) Login(email, password string) (*models.User, string, string, error) {
	// Find user
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, "", "", err
	}
	if user == nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	// Check password
	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return nil, "", "", errors.New("invalid credentials")
	}

	// Generate tokens
	accessToken, err := utils.GenerateToken(user.ID, user.Email, s.jwtExpiry, s.jwtSecret, "access")
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := utils.GenerateToken(user.ID, user.Email, s.refreshExpiry, s.jwtSecret, "refresh")
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (string, string, error) {
	claims, err := utils.ParseToken(refreshToken, s.jwtSecret)
	if err != nil {
		return "", "", errors.New("invalid refresh token")
	}

	if claims.Type != "refresh" {
		return "", "", errors.New("invalid token type")
	}

	// Generate new tokens
	newAccessToken, err := utils.GenerateToken(claims.UserID, claims.Email, s.jwtExpiry, s.jwtSecret, "access")
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err := utils.GenerateToken(claims.UserID, claims.Email, s.refreshExpiry, s.jwtSecret, "refresh")
	if err != nil {
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil
}

func (s *AuthService) GetUser(userID string) (*models.User, error) {
	return s.userRepo.GetByID(userID)
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/internal/service/auth_service.go
git commit -m "feat(backend): add authentication service"
```

---

### Task 8: 同步服务

**Files:**
- Create: `backend/internal/service/sync_service.go`

- [ ] **Step 1: 编写同步服务**

`backend/internal/service/sync_service.go`:
```go
package service

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

type SyncService struct {
	backupRepo *repository.BackupRepository
}

func NewSyncService(backupRepo *repository.BackupRepository) *SyncService {
	return &SyncService{backupRepo: backupRepo}
}

func (s *SyncService) GetStatus(userID string) (*models.BackupStatusResponse, error) {
	backup, err := s.backupRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	if backup == nil {
		return &models.BackupStatusResponse{
			HasBackup: false,
		}, nil
	}

	return &models.BackupStatusResponse{
		HasBackup:         true,
		Hash:              backup.DataHash,
		EntryCount:        backup.EntryCount,
		UpdatedAt:         backup.UpdatedAt,
		DeviceName:        backup.DeviceName,
		Encrypted:         backup.Encrypted,
		EncryptionVersion: backup.EncryptionVersion,
	}, nil
}

func (s *SyncService) Upload(userID string, req *models.UploadRequest) error {
	// Serialize data to JSON
	dataBytes, err := json.Marshal(req.Data)
	if err != nil {
		return err
	}

	backup := &models.Backup{
		UserID:            userID,
		DataJSON:          string(dataBytes),
		DataHash:          req.Hash,
		EntryCount:        req.EntryCount,
		DeviceName:        req.DeviceName,
		Encrypted:         req.Encrypted,
		EncryptionVersion: req.EncryptionVersion,
	}

	return s.backupRepo.Upsert(backup)
}

func (s *SyncService) Download(userID string) (*models.BackupData, string, time.Time, error) {
	backup, err := s.backupRepo.GetByUserID(userID)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	if backup == nil {
		return nil, "", time.Time{}, errors.New("backup not found")
	}

	var data models.BackupData
	if err := json.Unmarshal([]byte(backup.DataJSON), &data); err != nil {
		return nil, "", time.Time{}, err
	}

	return &data, backup.DataHash, backup.UpdatedAt, nil
}

func (s *SyncService) Delete(userID string) error {
	return s.backupRepo.Delete(userID)
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/internal/service/sync_service.go
git commit -m "feat(backend): add sync service"
```

---

### Task 9: 中间件

**Files:**
- Create: `backend/internal/middleware/auth.go`
- Create: `backend/internal/middleware/error.go`
- Create: `backend/internal/middleware/ratelimit.go`

- [ ] **Step 1: 编写认证中间件**

`backend/internal/middleware/auth.go`:
```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/daycapsule/backend/pkg/utils"
	"github.com/gin-gonic/gin"
)

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_MISSING",
					"message": "authorization header required",
				},
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_INVALID",
					"message": "invalid authorization header format",
				},
			})
			c.Abort()
			return
		}

		claims, err := utils.ParseToken(parts[1], jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_INVALID",
					"message": "invalid or expired token",
				},
			})
			c.Abort()
			return
		}

		if claims.Type != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_INVALID",
					"message": "invalid token type",
				},
			})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}
```

- [ ] **Step 2: 编写错误处理中间件**

`backend/internal/middleware/error.go`:
```go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func ErrorHandler(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			// Log error
			for _, err := range c.Errors {
				logger.Error("request error",
					zap.String("error", err.Error()),
					zap.String("path", c.Request.URL.Path),
				)
			}

			// Return generic error if not already written
			if !c.Writer.Written() {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "INTERNAL_ERROR",
						"message": "internal server error",
					},
				})
			}
		}
	}
}
```

- [ ] **Step 3: 编写限流中间件**

`backend/internal/middleware/ratelimit.go`:
```go
package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     time.Duration
	burst    int
}

type visitor struct {
	lastSeen time.Time
	tokens   int
}

func NewRateLimiter(requestsPerMinute int) gin.HandlerFunc {
	limiter := &rateLimiter{
		visitors: make(map[string]*visitor),
		rate:     time.Minute / time.Duration(requestsPerMinute),
		burst:    requestsPerMinute,
	}

	// Cleanup old visitors
	go limiter.cleanup()

	return limiter.limit
}

func (rl *rateLimiter) limit(c *gin.Context) {
	ip := c.ClientIP()

	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		v = &visitor{tokens: rl.burst - 1, lastSeen: time.Now()}
		rl.visitors[ip] = v
	} else {
		// Add tokens based on time passed
		timePassed := time.Since(v.lastSeen)
		tokensToAdd := int(timePassed / rl.rate)
		v.tokens = min(v.tokens+tokensToAdd, rl.burst)
		v.lastSeen = time.Now()

		if v.tokens > 0 {
			v.tokens--
		} else {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMITED",
					"message": "too many requests",
				},
			})
			c.Abort()
			return
		}
	}

	c.Next()
}

func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > time.Minute*10 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/middleware/
git commit -m "feat(backend): add auth, error and rate limit middlewares"
```

---

### Task 10: Handlers

**Files:**
- Create: `backend/internal/handlers/auth.go`
- Create: `backend/internal/handlers/sync.go`
- Create: `backend/internal/handlers/health.go`

- [ ] **Step 1: 编写认证 Handler**

`backend/internal/handlers/auth.go`:
```go
package handlers

import (
	"net/http"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
		return
	}

	user, accessToken, refreshToken, err := h.authService.Register(req.Email, req.Password)
	if err != nil {
		if err.Error() == "email already registered" {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "EMAIL_EXISTS",
					"message": "email already registered",
				},
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"user": models.UserResponse{
				ID:        user.ID,
				Email:     user.Email,
				CreatedAt: user.CreatedAt,
			},
			"token":        accessToken,
			"refreshToken": refreshToken,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
		return
	}

	user, accessToken, refreshToken, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_CREDENTIALS",
				"message": "invalid email or password",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": models.UserResponse{
				ID:        user.ID,
				Email:     user.Email,
				CreatedAt: user.CreatedAt,
			},
			"token":        accessToken,
			"refreshToken": refreshToken,
		},
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	type RefreshRequest struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}

	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": "refresh token required",
			},
		})
		return
	}

	newAccessToken, newRefreshToken, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "REFRESH_TOKEN_INVALID",
				"message": "invalid or expired refresh token",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":        newAccessToken,
			"refreshToken": newRefreshToken,
			"expiresIn":    604800, // 7 days in seconds
		},
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("userID")

	user, err := h.authService.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "failed to get user",
			},
		})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "USER_NOT_FOUND",
				"message": "user not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
	})
}
```

- [ ] **Step 2: 编写同步 Handler**

`backend/internal/handlers/sync.go`:
```go
package handlers

import (
	"net/http"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type SyncHandler struct {
	syncService *service.SyncService
}

func NewSyncHandler(syncService *service.SyncService) *SyncHandler {
	return &SyncHandler{syncService: syncService}
}

func (h *SyncHandler) Status(c *gin.Context) {
	userID := c.GetString("userID")

	status, err := h.syncService.GetStatus(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "failed to get backup status",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

func (h *SyncHandler) Upload(c *gin.Context) {
	userID := c.GetString("userID")

	var req models.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
		return
	}

	if err := h.syncService.Upload(userID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "failed to upload backup",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"uploadedAt": time.Now().UTC(),
			"hash":       req.Hash,
		},
	})
}

func (h *SyncHandler) Download(c *gin.Context) {
	userID := c.GetString("userID")

	data, hash, updatedAt, err := h.syncService.Download(userID)
	if err != nil {
		if err.Error() == "backup not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "BACKUP_NOT_FOUND",
					"message": "backup not found",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "failed to download backup",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"data":      data,
			"hash":      hash,
			"updatedAt": updatedAt,
		},
	})
}

func (h *SyncHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")

	if err := h.syncService.Delete(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "failed to delete backup",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "backup deleted",
	})
}
```

- [ ] **Step 3: 编写健康检查 Handler**

`backend/internal/handlers/health.go`:
```go
package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	db *sql.DB
}

func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) Check(c *gin.Context) {
	// Check database
	dbStatus := "connected"
	if err := h.db.Ping(); err != nil {
		dbStatus = "disconnected"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status":    "healthy",
			"version":   "1.0.0",
			"timestamp": time.Now().UTC(),
			"database":  dbStatus,
		},
	})
}
```

- [ ] **Step 4: Fix imports in sync handler**

Add missing import to `backend/internal/handlers/sync.go`:
```go
import (
	"net/http"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)
```

- [ ] **Step 5: Fix imports in health handler**

Add missing import to `backend/internal/handlers/health.go`:
```go
import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handlers/
git commit -m "feat(backend): add auth, sync and health handlers"
```

---

### Task 11: 主入口

**Files:**
- Create: `backend/cmd/server/main.go`

- [ ] **Step 1: 编写主入口文件**

`backend/cmd/server/main.go`:
```go
package main

import (
	"log"
	"os"

	"github.com/daycapsule/backend/internal/config"
	"github.com/daycapsule/backend/internal/handlers"
	"github.com/daycapsule/backend/internal/middleware"
	"github.com/daycapsule/backend/internal/repository"
	"github.com/daycapsule/backend/internal/service"
	"github.com/daycapsule/backend/pkg/utils"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize logger
	if err := utils.InitLogger(); err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer utils.Sync()

	logger := utils.GetLogger()

	// Load config
	cfg := config.Load()

	if cfg.DatabaseURL == "" {
		logger.Fatal("DATABASE_URL is required")
	}

	if cfg.JWTSecret == "" {
		logger.Fatal("JWT_SECRET is required")
	}

	// Connect to database
	db, err := config.NewDB(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	logger.Info("Connected to database")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	backupRepo := repository.NewBackupRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiry, cfg.RefreshExpiry)
	syncService := service.NewSyncService(backupRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	syncHandler := handlers.NewSyncHandler(syncService)
	healthHandler := handlers.NewHealthHandler(db)

	// Setup router
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.ErrorHandler(logger))
	router.Use(middleware.NewRateLimiter(100))

	// Health check (no auth required)
	router.GET("/health", healthHandler.Check)

	// Auth routes
	api := router.Group("/api")
	{
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/refresh", authHandler.Refresh)

		// Protected routes
		authorized := api.Group("/")
		authorized.Use(middleware.Auth(cfg.JWTSecret))
		{
			authorized.GET("/auth/me", authHandler.Me)

			// Sync routes
			authorized.GET("/sync/status", syncHandler.Status)
			authorized.POST("/sync/upload", syncHandler.Upload)
			authorized.GET("/sync/download", syncHandler.Download)
			authorized.DELETE("/sync/backup", syncHandler.Delete)
		}
	}

	// Start server
	port := cfg.Port
	logger.Info("Starting server", zap.String("port", port))

	if err := router.Run(":" + port); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/cmd/server/main.go
git commit -m "feat(backend): add main server entry point"
```

---

## Chunk 3: Docker 和部署配置

### Task 12: Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: 编写 Dockerfile**

`backend/Dockerfile`:
```dockerfile
# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

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

# Copy migrate tool (official image)
COPY --from=migrate/migrate /usr/local/bin/migrate /usr/local/bin/

# Copy binary, migrations and create logs dir
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run migrations and start
CMD migrate -path /app/migrations -database "$DATABASE_URL" up && ./server
```

- [ ] **Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat(backend): add Dockerfile with multi-stage build"
```

---

### Task 13: Docker Compose 和 Nginx 配置

**Files:**
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Create: `.env.example`

- [ ] **Step 1: 编写 Docker Compose**

`docker-compose.yml`:
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
    networks:
      - daycapsule-network

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: daycapsule-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://${DB_USER:-daycapsule}:${DB_PASSWORD:-changeme}@postgres:5432/${DB_NAME:-daycapsule}?sslmode=disable
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-min-32-chars-change-in-production}
      ENV: production
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - daycapsule-network

  nginx:
    image: nginx:alpine
    container_name: daycapsule-nginx
    restart: unless-stopped
    ports:
      - "${PORT:-8080}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - daycapsule-network

volumes:
  postgres_data:

networks:
  daycapsule-network:
    driver: bridge
```

- [ ] **Step 2: 编写 Nginx 配置**

`nginx.conf`:
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

- [ ] **Step 3: 编写环境变量示例**

`.env.example`:
```bash
# Database
DB_USER=daycapsule
DB_PASSWORD=your-secure-password-here
DB_NAME=daycapsule

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=change-this-to-a-random-secret-key-min-32-chars

# Server
PORT=8080
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml nginx.conf .env.example
git commit -m "feat(deploy): add docker-compose, nginx config and env example"
```

---

## Chunk 4: 客户端集成

### Task 14: 同步服务 API 封装

**Files:**
- Create: `app/src/services/syncService.ts`

- [ ] **Step 1: 编写同步服务**

`app/src/services/syncService.ts`:
```typescript
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8080/api';

interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      createdAt: string;
    };
    token: string;
    refreshToken: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface BackupStatus {
  success: boolean;
  data?: {
    hasBackup: boolean;
    hash?: string;
    entryCount?: number;
    updatedAt?: string;
    deviceName?: string;
    encrypted?: boolean;
    encryptionVersion?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface BackupData {
  entries: any[];
  tags: any[];
  version: number;
}

class SyncService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data;
  }

  // Auth
  async register(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const response = await this.request<{ data: { token: string; refreshToken: string } }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return response.data;
  }

  async getMe(): Promise<{ id: string; email: string; createdAt: string }> {
    const response = await this.request<{ data: { id: string; email: string; createdAt: string } }>('/auth/me');
    return response.data;
  }

  // Sync
  async getStatus(): Promise<BackupStatus> {
    return this.request<BackupStatus>('/sync/status');
  }

  async upload(data: BackupData, hash: string, entryCount: number, deviceName: string): Promise<void> {
    await this.request('/sync/upload', {
      method: 'POST',
      body: JSON.stringify({
        data,
        hash,
        entryCount,
        deviceName,
        encrypted: false,
        encryptionVersion: 0,
      }),
    });
  }

  async download(): Promise<{
    data: BackupData;
    hash: string;
    updatedAt: string;
  }> {
    const response = await this.request<{
      data: {
        data: BackupData;
        hash: string;
        updatedAt: string;
      };
    }>('/sync/download');
    return response.data;
  }

  async deleteBackup(): Promise<void> {
    await this.request('/sync/backup', {
      method: 'DELETE',
    });
  }
}

export const syncService = new SyncService();
export default syncService;
```

- [ ] **Step 2: Commit**

```bash
git add app/src/services/syncService.ts
git commit -m "feat(app): add sync service API client"
```

---

### Task 15: 同步状态管理 (Zustand Store)

**Files:**
- Create: `app/src/store/syncStore.ts`

- [ ] **Step 1: 编写同步 Store**

`app/src/store/syncStore.ts`:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import syncService from '@/src/services/syncService';

interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  autoSyncInterval: number; // minutes
  wifiOnly: boolean;
  serverUrl: string;
}

interface SyncState {
  // Config
  config: SyncConfig;
  setConfig: (config: Partial<SyncConfig>) => void;

  // Auth
  token: string | null;
  refreshToken: string | null;
  user: { id: string; email: string } | null;
  setAuth: (token: string, refreshToken: string, user: { id: string; email: string }) => void;
  clearAuth: () => void;

  // Sync state
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastSyncHash: string | null;
  serverStatus: {
    hasBackup: boolean;
    entryCount: number;
    updatedAt: Date | null;
  } | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  sync: () => Promise<void>;
  checkServerStatus: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Config
      config: {
        enabled: false,
        autoSync: true,
        autoSyncInterval: 30,
        wifiOnly: true,
        serverUrl: 'http://localhost:8080',
      },
      setConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
      },

      // Auth
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) => {
        syncService.setToken(token);
        set({ token, refreshToken, user });
      },
      clearAuth: () => {
        syncService.setToken(null);
        set({ token: null, refreshToken: null, user: null });
      },

      // Sync state
      isSyncing: false,
      lastSyncAt: null,
      lastSyncHash: null,
      serverStatus: null,

      // Actions
      login: async (email, password) => {
        const response = await syncService.login(email, password);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Login failed');
        }
        const { token, refreshToken, user } = response.data;
        get().setAuth(token, refreshToken, user);
      },

      register: async (email, password) => {
        const response = await syncService.register(email, password);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Registration failed');
        }
        const { token, refreshToken, user } = response.data;
        get().setAuth(token, refreshToken, user);
      },

      logout: () => {
        get().clearAuth();
      },

      sync: async () => {
        const { token } = get();
        if (!token) throw new Error('Not authenticated');

        set({ isSyncing: true });
        try {
          // TODO: Get entries from entryStore and upload
          // This will be implemented in Task 16
          set({ lastSyncAt: new Date() });
        } finally {
          set({ isSyncing: false });
        }
      },

      checkServerStatus: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await syncService.getStatus();
          if (response.success && response.data) {
            set({
              serverStatus: {
                hasBackup: response.data.hasBackup,
                entryCount: response.data.entryCount || 0,
                updatedAt: response.data.updatedAt
                  ? new Date(response.data.updatedAt)
                  : null,
              },
            });
          }
        } catch (error) {
          console.error('Failed to check server status:', error);
        }
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        config: state.config,
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        lastSyncAt: state.lastSyncAt,
        lastSyncHash: state.lastSyncHash,
      }),
    }
  )
);

export default useSyncStore;
```

- [ ] **Step 2: Commit**

```bash
git add app/src/store/syncStore.ts
git commit -m "feat(app): add sync store with auth and sync state management"
```

---

## 计划完成

实施计划已创建完成，保存在：
`docs/superpowers/plans/2026-03-16-backend-cloud-sync.md`

### 计划概览

| Chunk | 内容 | 任务数 |
|-------|------|--------|
| Chunk 1 | 后端基础设施 | 5 个任务 |
| Chunk 2 | 后端业务逻辑 | 6 个任务 |
| Chunk 3 | Docker 和部署配置 | 2 个任务 |
| Chunk 4 | 客户端集成 | 2 个任务 |

**总计**: 15 个任务，涵盖完整的后端云同步功能

---

**准备执行计划？**

计划已完成，可以开始执行。建议按 Chunk 顺序执行，每个 Task 完成后提交代码。
