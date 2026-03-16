package handlers

import (
	"net/http"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	user, accessToken, refreshToken, err := h.authService.Register(req.Email, req.Password)
	if err != nil {
		if err.Error() == "email already registered" {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error": gin.H{"code": "EMAIL_EXISTS", "message": "email already registered"},
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"user": models.UserResponse{
				ID:        user.ID,
				Email:     user.Email,
				CreatedAt: user.CreatedAt,
			},
			"token":        accessToken,
			"refreshToken": refreshToken,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	user, accessToken, refreshToken, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_CREDENTIALS", "message": "invalid email or password"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": models.UserResponse{
				ID:        user.ID,
				Email:     user.Email,
				CreatedAt: user.CreatedAt,
			},
			"token":        accessToken,
			"refreshToken": refreshToken,
		},
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": "refresh token required"},
		})
		return
	}

	newAccessToken, newRefreshToken, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error": gin.H{"code": "REFRESH_TOKEN_INVALID", "message": "invalid or expired refresh token"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":        newAccessToken,
			"refreshToken": newRefreshToken,
			"expiresIn":    604800,
		},
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("userID")

	user, err := h.authService.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to get user"},
		})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{"code": "USER_NOT_FOUND", "message": "user not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
	})
}
