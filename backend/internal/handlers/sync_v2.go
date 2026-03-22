package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/daycapsule/backend/internal/middleware"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type syncV2Service interface {
	Sync(ctx context.Context, userID string, req *service.SyncRequest) (*service.SyncResponse, error)
}

type SyncV2Handler struct {
	svc syncV2Service
}

func NewSyncV2Handler(svc syncV2Service) *SyncV2Handler {
	return &SyncV2Handler{svc: svc}
}

// Sync 处理 /api/sync 增量同步请求
func (h *SyncV2Handler) Sync(c *gin.Context) {
	userID := c.GetString("userID")

	var req service.SyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	middleware.SetAccessLogField(c, "sync.deviceId", req.DeviceID)
	middleware.SetAccessLogField(c, "sync.hasCursor", req.Cursor > 0)
	middleware.SetAccessLogField(c, "sync.clientChangeCount", len(req.ClientChanges))

	createCount := 0
	updateCount := 0
	deleteCount := 0
	for _, change := range req.ClientChanges {
		switch change.Op {
		case "create":
			createCount++
		case "update":
			updateCount++
		case "delete":
			deleteCount++
		}
	}
	middleware.SetAccessLogField(c, "sync.clientOpCreateCount", createCount)
	middleware.SetAccessLogField(c, "sync.clientOpUpdateCount", updateCount)
	middleware.SetAccessLogField(c, "sync.clientOpDeleteCount", deleteCount)

	if strings.TrimSpace(req.DeviceID) == "" || req.ClientChanges == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REQUEST", "message": "deviceId and clientChanges are required"},
		})
		return
	}

	for _, change := range req.ClientChanges {
		if change.Op == "update" && change.BaseUpdatedAt == nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "INVALID_REQUEST", "message": "baseUpdatedAt is required for update"},
			})
			return
		}
	}

	resp, err := h.svc.Sync(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to sync"},
		})
		return
	}

	if resp == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to sync"},
		})
		return
	}

	if resp.Results == nil {
		resp.Results = []service.SyncResult{}
	}
	if resp.ServerChanges == nil {
		resp.ServerChanges = []service.ServerChange{}
	}
	if resp.Conflicts == nil {
		resp.Conflicts = []service.Conflict{}
	}

	middleware.SetAccessLogField(c, "sync.resultCount", len(resp.Results))
	middleware.SetAccessLogField(c, "sync.serverChangeCount", len(resp.ServerChanges))
	middleware.SetAccessLogField(c, "sync.conflictCount", len(resp.Conflicts))

	appliedCount := 0
	conflictedCount := 0
	ignoredCount := 0
	for _, result := range resp.Results {
		switch result.Status {
		case "applied":
			appliedCount++
		case "conflicted":
			conflictedCount++
		case "ignored":
			ignoredCount++
		}
	}
	middleware.SetAccessLogField(c, "sync.resultAppliedCount", appliedCount)
	middleware.SetAccessLogField(c, "sync.resultConflictedCount", conflictedCount)
	middleware.SetAccessLogField(c, "sync.resultIgnoredCount", ignoredCount)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": resp})
}
