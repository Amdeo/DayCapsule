package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestIDMiddleware_PreservesIncomingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID())
	router.GET("/health", func(c *gin.Context) {
		c.Header("X-Seen-Request-Id", GetRequestID(c))
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set(RequestIDHeader, "req-from-client")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
	if got := rec.Header().Get(RequestIDHeader); got != "req-from-client" {
		t.Fatalf("expected response request id to preserve incoming header, got %q", got)
	}
	if got := rec.Header().Get("X-Seen-Request-Id"); got != "req-from-client" {
		t.Fatalf("expected handler context request id to preserve incoming header, got %q", got)
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
