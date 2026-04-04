package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/daycapsule/backend/internal/middleware"
	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type mediaStore interface {
	CreateWithMetadata(
		userID,
		filename,
		mimeType,
		storagePath string,
		size int64,
		input models.MediaFileCreateInput,
	) (*models.MediaFile, error)
	GetByIDForUser(userID, mediaID string) (*models.MediaFile, error)
	GetByID(mediaID string) (*models.MediaFile, error)
	Delete(userID, mediaID string) error
	FindByUserAndHash(userID, hash string) (*models.MediaFile, error)
	FindByUserAndTraceID(userID, traceID string) (*models.MediaFile, error)
}

type MediaHandler struct {
	mediaRepo mediaStore
	uploadDir string
}

func NewMediaHandler(mediaRepo mediaStore, uploadDir string) *MediaHandler {
	return &MediaHandler{mediaRepo: mediaRepo, uploadDir: uploadDir}
}

func (h *MediaHandler) Upload(c *gin.Context) {
	userID := c.GetString("userID")

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		middleware.SetAccessLogField(c, "upload.failedStage", "form_file")
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
		middleware.SetAccessLogField(c, "upload.failedStage", "mkdir")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to create upload directory"},
		})
		return
	}

	// Save file to disk
	ext := filepath.Ext(header.Filename)
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	middleware.SetAccessLogField(c, "upload.fieldName", "file")
	middleware.SetAccessLogField(c, "upload.mimeType", mimeType)
	middleware.SetAccessLogField(c, "upload.size", header.Size)
	middleware.SetAccessLogField(c, "upload.extension", ext)

	storageName := uuid.NewString() + ext
	storagePath := filepath.Join(userDir, storageName)

	dst, err := os.Create(storagePath)
	if err != nil {
		middleware.SetAccessLogField(c, "upload.failedStage", "create_file")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to save file"},
		})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(storagePath)
		middleware.SetAccessLogField(c, "upload.failedStage", "copy_file")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to write file"},
		})
		return
	}

	uploadMetadata := parseClientUploadMetadata(c)
	validationResult, err := service.ValidateUploadedPhoto(storagePath, uploadMetadata)
	if err != nil {
		_ = os.Remove(storagePath)
		middleware.SetAccessLogField(c, "upload.failedStage", "validate_file")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to validate uploaded media"},
		})
		return
	}

	// Dedup: traceID 优先（最精确），再用 hash 兜底
	var existing *models.MediaFile
	if uploadMetadata.TraceID != "" {
		existing, _ = h.mediaRepo.FindByUserAndTraceID(userID, uploadMetadata.TraceID)
	}
	if existing == nil && validationResult.SHA256 != "" {
		existing, _ = h.mediaRepo.FindByUserAndHash(userID, validationResult.SHA256)
	}
	if existing != nil {
		_ = os.Remove(storagePath)
		middleware.SetAccessLogField(c, "upload.dedup", "true")
		middleware.SetAccessLogField(c, "upload.mediaId", existing.ID)
		middleware.SetAccessLogField(c, "upload.validationStatus", existing.ValidationStatus)
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data": gin.H{
				"id":               existing.ID,
				"url":              fmt.Sprintf("/api/media/%s", existing.ID),
				"remoteHash":       existing.SHA256,
				"validationStatus": existing.ValidationStatus,
				"validationError":  existing.ValidationError,
			},
		})
		return
	}

	validatedAt := time.Now().UTC()
	media, err := h.mediaRepo.CreateWithMetadata(
		userID,
		header.Filename,
		mimeType,
		storagePath,
		validationResult.Size,
		models.MediaFileCreateInput{
			SHA256:              validationResult.SHA256,
			Width:               validationResult.Width,
			Height:              validationResult.Height,
			ValidationStatus:    validationResult.ValidationStatus,
			ValidationError:     validationResult.ValidationError,
			ValidatedAt:         &validatedAt,
			ClientLocalMediaID:  uploadMetadata.LocalMediaID,
			ClientPersistedHash: uploadMetadata.PersistedHash,
			UploadTraceID:       uploadMetadata.TraceID,
		},
	)
	if err != nil {
		os.Remove(storagePath)
		middleware.SetAccessLogField(c, "upload.failedStage", "save_record")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to save media record"},
		})
		return
	}
	middleware.SetAccessLogField(c, "upload.mediaId", media.ID)
	middleware.SetAccessLogField(c, "upload.validationStatus", media.ValidationStatus)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":               media.ID,
			"url":              fmt.Sprintf("/api/media/%s", media.ID),
			"remoteHash":       media.SHA256,
			"validationStatus": media.ValidationStatus,
			"validationError":  media.ValidationError,
		},
	})
}

func (h *MediaHandler) Download(c *gin.Context) {
	userID := c.GetString("userID")
	mediaID := c.Param("id")

	media, err := h.mediaRepo.GetByIDForUser(userID, mediaID)
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

	media, err := h.mediaRepo.GetByIDForUser(userID, mediaID)
	if err != nil || media == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   gin.H{"code": "NOT_FOUND", "message": "media not found"},
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

func parseClientUploadMetadata(c *gin.Context) service.ClientUploadMetadata {
	return service.ClientUploadMetadata{
		TraceID:        c.PostForm("traceId"),
		LocalMediaID:   c.PostForm("localMediaId"),
		PersistedHash:  c.PostForm("persistedHash"),
		SourceHash:     c.PostForm("sourceHash"),
		DeclaredSize:   parseFormInt64(c.PostForm("size")),
		DeclaredWidth:  parseFormInt(c.PostForm("width")),
		DeclaredHeight: parseFormInt(c.PostForm("height")),
	}
}

func parseFormInt(raw string) int {
	if raw == "" {
		return 0
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return parsed
}

func parseFormInt64(raw string) int64 {
	if raw == "" {
		return 0
	}
	parsed, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0
	}
	return parsed
}
