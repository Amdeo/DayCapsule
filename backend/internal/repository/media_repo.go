package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/google/uuid"
)

type MediaRepository struct {
	db *sql.DB
}

func NewMediaRepository(db *sql.DB) *MediaRepository {
	return &MediaRepository{db: db}
}

func (r *MediaRepository) Create(userID, filename, mimeType, storagePath string, size int64) (*models.MediaFile, error) {
	now := time.Now().UTC()
	id := uuid.NewString()

	media := &models.MediaFile{
		ID:          id,
		UserID:      userID,
		Filename:    filename,
		MimeType:    mimeType,
		Size:        size,
		StoragePath: storagePath,
		CreatedAt:   now,
	}

	query := `
		INSERT INTO media_files (id, user_id, filename, mime_type, size, storage_path, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.Exec(query, media.ID, media.UserID, media.Filename, media.MimeType, media.Size, media.StoragePath, media.CreatedAt)
	if err != nil {
		return nil, err
	}
	return media, nil
}

func (r *MediaRepository) GetByID(mediaID string) (*models.MediaFile, error) {
	var media models.MediaFile
	var createdAt string
	query := `SELECT id, user_id, entry_id, filename, mime_type, size, storage_path, created_at FROM media_files WHERE id = ?`
	err := r.db.QueryRow(query, mediaID).Scan(
		&media.ID, &media.UserID, &media.EntryID, &media.Filename, &media.MimeType,
		&media.Size, &media.StoragePath, &createdAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	media.CreatedAt, _ = parseSQLiteTime(createdAt)
	return &media, nil
}

func (r *MediaRepository) LinkToEntry(mediaID, entryID string) error {
	_, err := r.db.Exec("UPDATE media_files SET entry_id = ? WHERE id = ?", entryID, mediaID)
	return err
}

func (r *MediaRepository) Delete(userID, mediaID string) error {
	result, err := r.db.Exec("DELETE FROM media_files WHERE id = ? AND user_id = ?", mediaID, userID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("media not found")
	}
	return nil
}

func (r *MediaRepository) GetByEntryID(entryID string) ([]*models.MediaFile, error) {
	query := `SELECT id, user_id, entry_id, filename, mime_type, size, storage_path, created_at FROM media_files WHERE entry_id = ?`
	rows, err := r.db.Query(query, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*models.MediaFile
	for rows.Next() {
		var m models.MediaFile
		var createdAt string
		if err := rows.Scan(&m.ID, &m.UserID, &m.EntryID, &m.Filename, &m.MimeType, &m.Size, &m.StoragePath, &createdAt); err != nil {
			return nil, err
		}
		m.CreatedAt, _ = parseSQLiteTime(createdAt)
		files = append(files, &m)
	}
	return files, rows.Err()
}
