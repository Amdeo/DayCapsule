package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/google/uuid"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(email, passwordHash string) (*models.User, error) {
	now := time.Now().UTC()
	id := uuid.NewString()
	user := &models.User{}
	query := `
		INSERT INTO users (id, email, password_hash, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`
	_, err := r.db.Exec(query, id, email, passwordHash, now, now)
	if err != nil {
		return nil, err
	}
	user.ID = id
	user.Email = email
	user.PasswordHash = passwordHash
	user.CreatedAt = now
	user.UpdatedAt = now
	return user, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, refresh_token_jti, refresh_token_expires_at, created_at, updated_at
		FROM users
		WHERE email = ?
	`
	var createdAt, updatedAt string
	var refreshJTI, refreshExpiresAt sql.NullString
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &refreshJTI, &refreshExpiresAt, &createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if refreshJTI.Valid {
		user.RefreshTokenJTI = &refreshJTI.String
	}
	if refreshExpiresAt.Valid {
		parsed, err := parseSQLiteTime(refreshExpiresAt.String)
		if err == nil {
			user.RefreshTokenExpiresAt = &parsed
		}
	}
	user.CreatedAt, err = parseSQLiteTime(createdAt)
	if err != nil {
		return nil, err
	}
	user.UpdatedAt, err = parseSQLiteTime(updatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByID(id string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, refresh_token_jti, refresh_token_expires_at, created_at, updated_at
		FROM users
		WHERE id = ?
	`
	var createdAt, updatedAt, refreshExpiresAt string
	var refreshJTI sql.NullString
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &refreshJTI, &refreshExpiresAt, &createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if refreshJTI.Valid {
		user.RefreshTokenJTI = &refreshJTI.String
	}
	if refreshExpiresAt != "" {
		parsed, err := parseSQLiteTime(refreshExpiresAt)
		if err == nil {
			user.RefreshTokenExpiresAt = &parsed
		}
	}
	user.CreatedAt, err = parseSQLiteTime(createdAt)
	if err != nil {
		return nil, err
	}
	user.UpdatedAt, err = parseSQLiteTime(updatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) UpdateRefreshToken(userID, jti string, expiresAt time.Time) error {
	query := `UPDATE users SET refresh_token_jti = ?, refresh_token_expires_at = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.Exec(query, jti, expiresAt.Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339), userID)
	return err
}

func (r *UserRepository) ClearRefreshToken(userID string) error {
	query := `UPDATE users SET refresh_token_jti = NULL, refresh_token_expires_at = NULL, updated_at = ? WHERE id = ?`
	_, err := r.db.Exec(query, time.Now().UTC().Format(time.RFC3339), userID)
	return err
}
