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
		SELECT id, email, password_hash, created_at, updated_at
		FROM users
		WHERE email = ?
	`
	var createdAt, updatedAt string
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
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
		SELECT id, email, created_at, updated_at
		FROM users
		WHERE id = ?
	`
	var createdAt, updatedAt string
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
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
