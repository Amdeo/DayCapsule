package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestRequestIDMiddleware_PreservesValidIncomingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID())
	router.GET("/health", func(c *gin.Context) {
		c.Header("X-Seen-Request-Id", GetRequestID(c))
		c.Status(http.StatusNoContent)
	})

	validID := uuid.NewString()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set(RequestIDHeader, validID)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
	if got := rec.Header().Get(RequestIDHeader); got != validID {
		t.Fatalf("expected response request id to preserve incoming header, got %q", got)
	}
	if got := rec.Header().Get("X-Seen-Request-Id"); got != validID {
		t.Fatalf("expected handler context request id to preserve incoming header, got %q", got)
	}
}

func TestRequestIDMiddleware_RejectsInvalidIncomingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID())
	router.GET("/health", func(c *gin.Context) {
		c.Header("X-Seen-Request-Id", GetRequestID(c))
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set(RequestIDHeader, "not-a-valid-uuid; DROP TABLE logs;")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
	// 非法 UUID 应被替换为服务端生成的合法 UUID
	responseID := rec.Header().Get(RequestIDHeader)
	if _, err := uuid.Parse(responseID); err != nil {
		t.Fatalf("expected server-generated UUID, got %q", responseID)
	}
	if got := rec.Header().Get("X-Seen-Request-Id"); got != responseID {
		t.Fatalf("expected handler context request id %q to match response header %q", got, responseID)
	}
}

func TestRequestIDMiddleware_GeneratesAndEchoesHeaderWhenMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID())
	router.GET("/health", func(c *gin.Context) {
		c.Header("X-Seen-Request-Id", GetRequestID(c))
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}

	responseID := rec.Header().Get(RequestIDHeader)
	if responseID == "" {
		t.Fatal("expected generated request id in response header")
	}
	if got := rec.Header().Get("X-Seen-Request-Id"); got != responseID {
		t.Fatalf("expected handler context request id %q to match response header %q", got, responseID)
	}
}
