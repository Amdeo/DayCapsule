package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const RequestIDHeader = "X-Request-Id"

const requestIDContextKey = "requestID"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.NewString()
		}

		c.Set(requestIDContextKey, requestID)
		c.Header(RequestIDHeader, requestID)
		c.Next()
	}
}

func GetRequestID(c *gin.Context) string {
	if c == nil {
		return ""
	}

	if value, ok := c.Get(requestIDContextKey); ok {
		if requestID, ok := value.(string); ok {
			return requestID
		}
	}

	return ""
}
