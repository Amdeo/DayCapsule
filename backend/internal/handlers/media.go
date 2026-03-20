package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/daycapsule/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MediaHandler struct {
	mediaRepo  *repository.MediaRepository
	uploadDir  string
}

func NewMediaHandler(mediaRepo *repository.MediaRepository, uploadDir string) *MediaHandler {
	return &MediaHandler{mediaRepo: mediaRepo, uploadDir: uploadDir}
}

func (h *MediaHandler) Upload(c *gin.Context) {
	userID := c.GetString("userID")

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REQUEST", "message": "file field required"},
		})
		return
	}
	defer file.Close()

	// Create user upload directory
	userDir := filepath.Join(h.uploadDir, userID)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to create upload directory"},
		})
		return
	}

	// Save file to disk
	ext := filepath.Ext(header.Filename)
	storageName := uuid.NewString() + ext
	storagePath := filepath.Join(userDir, storageName)

	dst, err := os.Create(storagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to save file"},
		})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to write file"},
		})
		return
	}

	// Detect MIME type
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	media, err := h.mediaRepo.Create(userID, header.Filename, mimeType, storagePath, header.Size)
	if err != nil {
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to save media record"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":  media.ID,
			"url": fmt.Sprintf("/api/media/%s", media.ID),
		},
	})
}

func (h *MediaHandler) Download(c *gin.Context) {
	mediaID := c.Param("id")

	media, err := h.mediaRepo.GetByID(mediaID)
	if err != nil || media == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   gin.H{"code": "NOT_FOUND", "message": "media not found"},
		})
		return
	}

	c.Header("Content-Type", media.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", media.Filename))
	c.File(media.StoragePath)
}

func (h *MediaHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")
	mediaID := c.Param("id")

	// Get media to find storage path
	media, err := h.mediaRepo.GetByID(mediaID)
	if err != nil || media == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   gin.H{"code": "NOT_FOUND", "message": "media not found"},
		})
		return
	}

	if media.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   gin.H{"code": "FORBIDDEN", "message": "not your media"},
		})
		return
	}

	if err := h.mediaRepo.Delete(userID, mediaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to delete media"},
		})
		return
	}

	// Remove file from disk
	os.Remove(media.StoragePath)

	c.JSON(http.StatusOK, gin.H{"success": true})
}
