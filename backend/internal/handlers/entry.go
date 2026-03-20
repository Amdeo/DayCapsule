package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type EntryHandler struct {
	entryService *service.EntryService
}

func NewEntryHandler(entryService *service.EntryService) *EntryHandler {
	return &EntryHandler{entryService: entryService}
}

func (h *EntryHandler) List(c *gin.Context) {
	userID := c.GetString("userID")

	limit := 20
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var cursor *int64
	if cs := c.Query("cursor"); cs != "" {
		if v, err := strconv.ParseInt(cs, 10, 64); err == nil {
			cursor = &v
		}
	}

	entryType := c.Query("type")
	search := c.Query("search")

	var tags []string
	if t := c.Query("tags"); t != "" {
		tags = strings.Split(t, ",")
	}

	entries, err := h.entryService.GetPage(userID, limit, cursor, entryType, search, tags)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to list entries"},
		})
		return
	}

	if entries == nil {
		entries = []*models.EntryResponse{}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": entries})
}

func (h *EntryHandler) Create(c *gin.Context) {
	userID := c.GetString("userID")

	var req models.CreateEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	entry, err := h.entryService.Create(userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to create entry"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": entry})
}

func (h *EntryHandler) Update(c *gin.Context) {
	userID := c.GetString("userID")
	entryID := c.Param("id")

	var req models.UpdateEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	if err := h.entryService.Update(userID, entryID, &req); err != nil {
		if err.Error() == "entry not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   gin.H{"code": "NOT_FOUND", "message": "entry not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to update entry"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *EntryHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")
	entryID := c.Param("id")

	if err := h.entryService.Delete(userID, entryID); err != nil {
		if err.Error() == "entry not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   gin.H{"code": "NOT_FOUND", "message": "entry not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to delete entry"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *EntryHandler) Tags(c *gin.Context) {
	userID := c.GetString("userID")

	tags, err := h.entryService.GetAllTags(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "INTERNAL_ERROR", "message": "failed to get tags"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": tags})
}
