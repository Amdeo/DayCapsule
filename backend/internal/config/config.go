package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DatabasePath  string
	JWTSecret     string
	JWTExpiry     int // hours
	RefreshExpiry int // hours
	UploadDir     string
	BaseURL       string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:          getEnv("PORT", "3000"),
		DatabasePath:  getEnv("DATABASE_PATH", "./data/daycapsule.db"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		JWTExpiry:     getEnvAsInt("JWT_EXPIRY", 168),
		RefreshExpiry: getEnvAsInt("REFRESH_EXPIRY", 720),
		UploadDir:     getEnv("UPLOAD_DIR", "./data/uploads"),
		BaseURL:       getEnv("BASE_URL", "http://localhost:3000"),
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
