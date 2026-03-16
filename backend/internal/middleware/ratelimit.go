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
