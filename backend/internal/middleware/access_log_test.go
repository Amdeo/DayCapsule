package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
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

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set(RequestIDHeader, "req-access-1")
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
	if got := fields["requestId"]; got != "req-access-1" {
		t.Fatalf("expected requestId req-access-1, got %#v", got)
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

func TestShouldEnableAccessLog_DisablesOnlyInProduction(t *testing.T) {
	cases := []struct {
		name string
		env  string
		want bool
	}{
		{name: "empty env", env: "", want: true},
		{name: "development", env: "development", want: true},
		{name: "test", env: "test", want: true},
		{name: "production", env: "production", want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := ShouldEnableAccessLog(tc.env); got != tc.want {
				t.Fatalf("expected %v for env %q, got %v", tc.want, tc.env, got)
			}
		})
	}
}
