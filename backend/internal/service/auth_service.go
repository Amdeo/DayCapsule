package service

import (
	"errors"
	"regexp"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
	"github.com/daycapsule/backend/pkg/utils"
)

type AuthService struct {
	userRepo      *repository.UserRepository
	jwtSecret     string
	jwtExpiry     int
	refreshExpiry int
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, jwtExpiry, refreshExpiry int) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		jwtSecret:     jwtSecret,
		jwtExpiry:     jwtExpiry,
		refreshExpiry: refreshExpiry,
	}
}

func (s *AuthService) validatePassword(password string) error {
	if len(password) < 8 || len(password) > 64 {
		return errors.New("password must be between 8 and 64 characters")
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("password must contain at least one uppercase letter, one lowercase letter, and one digit")
	}

	return nil
}

func (s *AuthService) Register(email, password string) (*models.User, string, string, error) {
	if err := s.validatePassword(password); err != nil {
		return nil, "", "", err
	}

	existingUser, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, "", "", err
	}
	if existingUser != nil {
		return nil, "", "", errors.New("email already registered")
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, "", "", err
	}

	user, err := s.userRepo.Create(email, hash)
	if err != nil {
		return nil, "", "", err
	}

	accessToken, err := utils.GenerateToken(user.ID, user.Email, s.jwtExpiry, s.jwtSecret, "access")
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := utils.GenerateToken(user.ID, user.Email, s.refreshExpiry, s.jwtSecret, "refresh")
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

func (s *AuthService) Login(email, password string) (*models.User, string, string, error) {
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, "", "", err
	}
	if user == nil {
		return nil, "", "", errors.New("invalid credentials")
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return nil, "", "", errors.New("invalid credentials")
	}

	accessToken, err := utils.GenerateToken(user.ID, user.Email, s.jwtExpiry, s.jwtSecret, "access")
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := utils.GenerateToken(user.ID, user.Email, s.refreshExpiry, s.jwtSecret, "refresh")
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (string, string, error) {
	claims, err := utils.ParseToken(refreshToken, s.jwtSecret)
	if err != nil {
		return "", "", errors.New("invalid refresh token")
	}

	if claims.Type != "refresh" {
		return "", "", errors.New("invalid token type")
	}

	newAccessToken, err := utils.GenerateToken(claims.UserID, claims.Email, s.jwtExpiry, s.jwtSecret, "access")
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err := utils.GenerateToken(claims.UserID, claims.Email, s.refreshExpiry, s.jwtSecret, "refresh")
	if err != nil {
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil
}

func (s *AuthService) GetUser(userID string) (*models.User, error) {
	return s.userRepo.GetByID(userID)
}
