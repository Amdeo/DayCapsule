package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type SyncHandler struct {
	syncService         *service.SyncService
	syncOverviewService syncOverviewService
}

type syncOverviewService interface {
	GetByUser(userID string) (*service.SyncOverview, error)
}

func NewSyncHandler(syncService *service.SyncService, syncOverviewService syncOverviewService) *SyncHandler {
	return &SyncHandler{syncService: syncService, syncOverviewService: syncOverviewService}
}

func (h *SyncHandler) Status(c *gin.Context) {
	userID := c.GetString("userID")

	status, err := h.syncService.GetStatus(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to get backup status"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": status})
}

func (h *SyncHandler) Upload(c *gin.Context) {
	userID := c.GetString("userID")

	var req models.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	if err := h.syncService.Upload(userID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to upload backup"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"uploadedAt": time.Now().UTC(),
			"hash":       req.Hash,
		},
	})
}

func (h *SyncHandler) Download(c *gin.Context) {
	userID := c.GetString("userID")

	data, hash, updatedAt, err := h.syncService.Download(userID)
	if err != nil {
		if errors.Is(err, service.ErrBackupNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   gin.H{"code": "BACKUP_NOT_FOUND", "message": "backup not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to download backup"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"data":      data,
			"hash":      hash,
			"updatedAt": updatedAt,
		},
	})
}

func (h *SyncHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")

	if err := h.syncService.Delete(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to delete backup"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "backup deleted"})
}

func (h *SyncHandler) Overview(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   gin.H{"code": "UNAUTHORIZED", "message": "unauthorized"},
		})
		return
	}

	overview, err := h.syncOverviewService.GetByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to get sync overview"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    overview,
	})
}
