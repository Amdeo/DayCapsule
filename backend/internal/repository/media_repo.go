package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/google/uuid"
)

type entryMediaExecer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

type entryMediaQueryer interface {
	Query(query string, args ...interface{}) (*sql.Rows, error)
}

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

func (r *MediaRepository) LinkToEntryTx(tx *sql.Tx, mediaID, entryID string) error {
	_, err := tx.Exec("UPDATE media_files SET entry_id = ? WHERE id = ?", entryID, mediaID)
	return err
}

func (r *MediaRepository) UnlinkEntryMediaExcept(entryID string, keepMediaIDs []string) error {
	return r.unlinkEntryMediaExcept(r.db, entryID, keepMediaIDs)
}

func (r *MediaRepository) UnlinkEntryMediaExceptTx(tx *sql.Tx, entryID string, keepMediaIDs []string) error {
	return r.unlinkEntryMediaExcept(tx, entryID, keepMediaIDs)
}

func (r *MediaRepository) unlinkEntryMediaExcept(execer entryMediaExecer, entryID string, keepMediaIDs []string) error {
	if len(keepMediaIDs) == 0 {
		_, err := execer.Exec("UPDATE media_files SET entry_id = NULL WHERE entry_id = ?", entryID)
		return err
	}

	placeholders := make([]string, 0, len(keepMediaIDs))
	args := make([]interface{}, 0, len(keepMediaIDs)+1)
	args = append(args, entryID)
	for _, mediaID := range keepMediaIDs {
		placeholders = append(placeholders, "?")
		args = append(args, mediaID)
	}

	query := fmt.Sprintf(
		"UPDATE media_files SET entry_id = NULL WHERE entry_id = ? AND id NOT IN (%s)",
		strings.Join(placeholders, ", "),
	)
	_, err := execer.Exec(query, args...)
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
	return r.getByEntryID(r.db, entryID)
}

func (r *MediaRepository) GetByEntryIDTx(tx *sql.Tx, entryID string) ([]*models.MediaFile, error) {
	return r.getByEntryID(tx, entryID)
}

func (r *MediaRepository) getByEntryID(queryer entryMediaQueryer, entryID string) ([]*models.MediaFile, error) {
	query := `SELECT id, user_id, entry_id, filename, mime_type, size, storage_path, created_at FROM media_files WHERE entry_id = ?`
	rows, err := queryer.Query(query, entryID)
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

func (r *MediaRepository) DeleteByEntryID(userID, entryID string) error {
	return r.deleteByEntryID(r.db, userID, entryID)
}

func (r *MediaRepository) DeleteByEntryIDTx(tx *sql.Tx, userID, entryID string) error {
	return r.deleteByEntryID(tx, userID, entryID)
}

func (r *MediaRepository) deleteByEntryID(execer entryMediaExecer, userID, entryID string) error {
	_, err := execer.Exec("DELETE FROM media_files WHERE user_id = ? AND entry_id = ?", userID, entryID)
	return err
}

func (r *MediaRepository) FindByUserIDAndFilename(userID, filename string) (*models.MediaFile, error) {
	var media models.MediaFile
	var createdAt string

	query := `
		SELECT id, user_id, entry_id, filename, mime_type, size, storage_path, created_at
		FROM media_files
		WHERE user_id = ? AND filename = ?
		ORDER BY CASE WHEN entry_id IS NULL THEN 0 ELSE 1 END, created_at DESC
		LIMIT 1
	`
	err := r.db.QueryRow(query, userID, filename).Scan(
		&media.ID,
		&media.UserID,
		&media.EntryID,
		&media.Filename,
		&media.MimeType,
		&media.Size,
		&media.StoragePath,
		&createdAt,
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

func (r *MediaRepository) CountAndBytes(userID string) (int, int64, error) {
	var count int
	var totalBytes int64
	err := r.db.QueryRow("SELECT COUNT(*), COALESCE(SUM(size), 0) FROM media_files WHERE user_id = ?", userID).Scan(&count, &totalBytes)
	if err != nil {
		return 0, 0, err
	}
	return count, totalBytes, nil
}
