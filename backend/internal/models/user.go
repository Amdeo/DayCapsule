package models

import "time"

type User struct {
	ID                     string     `json:"id"`
	Email                  string     `json:"email"`
	PasswordHash           string     `json:"-"`
	RefreshTokenJTI        *string    `json:"-"`
	RefreshTokenExpiresAt  *time.Time `json:"-"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              time.Time  `json:"updatedAt"`
}

type UserRegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=64"`
}

type UserLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}
