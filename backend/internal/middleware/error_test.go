package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestErrorHandler_LogsRequestMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)

	core, recorded := observer.New(zap.ErrorLevel)
	logger := zap.New(core)

	router := gin.New()
	router.Use(RequestID())
	router.Use(ErrorHandler(logger))
	router.GET("/broken", func(c *gin.Context) {
		c.Status(http.StatusTeapot)
		_ = c.Error(errors.New("boom"))
	})

	validRequestID := uuid.NewString()
	req := httptest.NewRequest(http.MethodGet, "/broken", nil)
	req.Header.Set(RequestIDHeader, validRequestID)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	entries := recorded.All()
	if len(entries) != 1 {
		t.Fatalf("expected 1 error log entry, got %d", len(entries))
	}

	fields := entries[0].ContextMap()
	if got := fields["requestId"]; got != validRequestID {
		t.Fatalf("expected requestId %q, got %#v", validRequestID, got)
	}
	if got := fields["method"]; got != http.MethodGet {
		t.Fatalf("expected method GET, got %#v", got)
	}
	if got := fields["path"]; got != "/broken" {
		t.Fatalf("expected path /broken, got %#v", got)
	}
	if got := fields["status"]; got != int64(http.StatusTeapot) {
		t.Fatalf("expected status 418, got %#v", got)
	}
}
