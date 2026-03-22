package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestAccessLogMiddleware_LogsBaseFieldsAndSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)

	core, recorded := observer.New(zap.InfoLevel)
	logger := zap.New(core)

	router := gin.New()
	router.Use(RequestID())
	router.Use(AccessLog(logger))
	router.GET("/health", func(c *gin.Context) {
		c.Set("userID", "user-1")
		SetAccessLogField(c, "sync.deviceId", "device-1")
		SetAccessLogField(c, "sync.clientChangeCount", 3)
		c.Status(http.StatusNoContent)
	})

	validRequestID := uuid.NewString()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set(RequestIDHeader, validRequestID)
	req.Header.Set("User-Agent", "backend-test")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}

	entries := recorded.All()
	if len(entries) != 1 {
		t.Fatalf("expected 1 access log entry, got %d", len(entries))
	}

	fields := entries[0].ContextMap()
	if got := fields["requestId"]; got != validRequestID {
		t.Fatalf("expected requestId %q, got %#v", validRequestID, got)
	}
	if got := fields["method"]; got != http.MethodGet {
		t.Fatalf("expected method GET, got %#v", got)
	}
	if got := fields["path"]; got != "/health" {
		t.Fatalf("expected path /health, got %#v", got)
	}
	if got := fields["status"]; got != int64(http.StatusNoContent) {
		t.Fatalf("expected status 204, got %#v", got)
	}
	if _, ok := fields["latencyMs"]; !ok {
		t.Fatal("expected latencyMs field in access log")
	}
	if got := fields["clientIP"]; got == "" {
		t.Fatalf("expected clientIP to be non-empty, got %#v", got)
	}
	if got := fields["userID"]; got != "user-1" {
		t.Fatalf("expected userID user-1, got %#v", got)
	}
	if got := fields["userAgent"]; got != "backend-test" {
		t.Fatalf("expected userAgent backend-test, got %#v", got)
	}
	if got := fields["sync.deviceId"]; got != "device-1" {
		t.Fatalf("expected sync.deviceId device-1, got %#v", got)
	}
	if got := fields["sync.clientChangeCount"]; got != int64(3) {
		t.Fatalf("expected sync.clientChangeCount 3, got %#v", got)
	}
}

func TestShouldEnableAccessLog_AlwaysEnabled(t *testing.T) {
	cases := []struct {
		name string
		env  string
	}{
		{name: "empty env", env: ""},
		{name: "development", env: "development"},
		{name: "test", env: "test"},
		{name: "production", env: "production"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ShouldEnableAccessLog(tc.env); !got {
				t.Fatalf("expected true for env %q, got false", tc.env)
			}
		})
	}
}
