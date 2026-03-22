package middleware

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const accessLogFieldsContextKey = "accessLogFields"

func AccessLog(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()

		fields := []zap.Field{
			zap.String("requestId", GetRequestID(c)),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Int64("latencyMs", time.Since(startedAt).Milliseconds()),
			zap.String("clientIP", c.ClientIP()),
			zap.String("userID", c.GetString("userID")),
			zap.String("userAgent", c.Request.UserAgent()),
			zap.Int("errorCount", len(c.Errors)),
		}

		if summaryFields, ok := c.Get(accessLogFieldsContextKey); ok {
			if values, ok := summaryFields.(map[string]any); ok {
				for key, value := range values {
					fields = append(fields, zap.Any(key, value))
				}
			}
		}

		logger.Info("access log", fields...)
	}
}

func ShouldEnableAccessLog(env string) bool {
	return strings.TrimSpace(strings.ToLower(env)) != "production"
}

func SetAccessLogField(c *gin.Context, key string, value any) {
	if c == nil || key == "" {
		return
	}

	existing, ok := c.Get(accessLogFieldsContextKey)
	if !ok {
		c.Set(accessLogFieldsContextKey, map[string]any{key: value})
		return
	}

	fields, ok := existing.(map[string]any)
	if !ok {
		fields = map[string]any{}
	}
	fields[key] = value
	c.Set(accessLogFieldsContextKey, fields)
}

func GetAccessLogField(c *gin.Context, key string) (any, bool) {
	if c == nil || key == "" {
		return nil, false
	}

	existing, ok := c.Get(accessLogFieldsContextKey)
	if !ok {
		return nil, false
	}

	fields, ok := existing.(map[string]any)
	if !ok {
		return nil, false
	}

	value, ok := fields[key]
	return value, ok
}
