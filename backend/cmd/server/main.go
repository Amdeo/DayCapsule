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
	"go.uber.org/zap"
)

func main() {
	if err := utils.InitLogger(); err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer utils.Sync()

	logger := utils.GetLogger()

	cfg := config.Load()

	if cfg.JWTSecret == "" {
		logger.Fatal("JWT_SECRET is required")
	}

	db, err := config.NewDB(cfg.DatabasePath)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	if err := config.EnsureSchema(db); err != nil {
		logger.Fatal("Failed to initialize schema", zap.Error(err))
	}

	userRepo := repository.NewUserRepository(db)
	backupRepo := repository.NewBackupRepository(db)
	changeRepo := repository.NewChangeRepository(db)
	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)

	authService := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiry, cfg.RefreshExpiry)
	syncService := service.NewSyncService(backupRepo)
	syncV2Service := service.NewSyncV2Service(entryRepo, changeRepo)
	entryService := service.NewEntryService(entryRepo, mediaRepo, cfg.BaseURL)

	authHandler := handlers.NewAuthHandler(authService)
	syncHandler := handlers.NewSyncHandler(syncService)
	syncV2Handler := handlers.NewSyncV2Handler(syncV2Service)
	entryHandler := handlers.NewEntryHandler(entryService)
	mediaHandler := handlers.NewMediaHandler(mediaRepo, cfg.UploadDir)
	healthHandler := handlers.NewHealthHandler(db)

	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.RequestID())
	if middleware.ShouldEnableAccessLog(os.Getenv("ENV")) {
		router.Use(middleware.AccessLog(logger))
	}
	router.Use(gin.Recovery())
	router.Use(middleware.ErrorHandler(logger))
	router.Use(middleware.NewRateLimiter(100))

	router.GET("/health", healthHandler.Check)

	api := router.Group("/api")
	{
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/refresh", authHandler.Refresh)

		authorized := api.Group("/")
		authorized.Use(middleware.Auth(cfg.JWTSecret))
		{
			authorized.GET("/auth/me", authHandler.Me)
			authorized.GET("/sync/status", syncHandler.Status)
			authorized.POST("/sync/upload", syncHandler.Upload)
			authorized.GET("/sync/download", syncHandler.Download)
			authorized.DELETE("/sync/backup", syncHandler.Delete)
			authorized.POST("/sync", syncV2Handler.Sync)

			// Entries CRUD
			authorized.GET("/entries", entryHandler.List)
			authorized.POST("/entries", entryHandler.Create)
			authorized.PUT("/entries/:id", entryHandler.Update)
			authorized.DELETE("/entries/:id", entryHandler.Delete)
			authorized.GET("/tags", entryHandler.Tags)
			authorized.GET("/entries/count", entryHandler.Count)
			authorized.GET("/entries/export", entryHandler.Export)
			authorized.POST("/entries/import", entryHandler.Import)

			// Media
			authorized.POST("/media/upload", mediaHandler.Upload)
			authorized.GET("/media/:id", mediaHandler.Download)
			authorized.DELETE("/media/:id", mediaHandler.Delete)
		}
	}

	port := cfg.Port
	logger.Info("Starting server", zap.String("port", port))

	if err := router.Run(":" + port); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
