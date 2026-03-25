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
	return r.CreateWithMetadata(userID, filename, mimeType, storagePath, size, models.MediaFileCreateInput{})
}

func (r *MediaRepository) CreateWithMetadata(
	userID,
	filename,
	mimeType,
	storagePath string,
	size int64,
	input models.MediaFileCreateInput,
) (*models.MediaFile, error) {
	now := time.Now().UTC()
	id := uuid.NewString()
	validationStatus := input.ValidationStatus
	if validationStatus == "" {
		validationStatus = "healthy"
	}
	validatedAt := input.ValidatedAt
	if validatedAt == nil {
		validatedAt = &now
	}

	media := &models.MediaFile{
		ID:                  id,
		UserID:              userID,
		Filename:            filename,
		MimeType:            mimeType,
		Size:                size,
		StoragePath:         storagePath,
		SHA256:              input.SHA256,
		Width:               input.Width,
		Height:              input.Height,
		ValidationStatus:    validationStatus,
		ValidationError:     input.ValidationError,
		ValidatedAt:         validatedAt,
		ClientLocalMediaID:  input.ClientLocalMediaID,
		ClientPersistedHash: input.ClientPersistedHash,
		UploadTraceID:       input.UploadTraceID,
		CreatedAt:           now,
	}

	query := `
		INSERT INTO media_files (
			id, user_id, filename, mime_type, size, storage_path,
			sha256, width, height, validation_status, validation_error, validated_at,
			client_local_media_id, client_persisted_hash, upload_trace_id, created_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.Exec(
		query,
		media.ID,
		media.UserID,
		media.Filename,
		media.MimeType,
		media.Size,
		media.StoragePath,
		media.SHA256,
		media.Width,
		media.Height,
		media.ValidationStatus,
		media.ValidationError,
		media.ValidatedAt,
		media.ClientLocalMediaID,
		media.ClientPersistedHash,
		media.UploadTraceID,
		media.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return media, nil
}

func (r *MediaRepository) GetByID(mediaID string) (*models.MediaFile, error) {
	query := `
		SELECT id, user_id, entry_id, filename, mime_type, size, storage_path,
		       sha256, width, height, validation_status, validation_error, validated_at,
		       client_local_media_id, client_persisted_hash, upload_trace_id, created_at
		FROM media_files
		WHERE id = ?
	`
	media, err := scanMediaFile(r.db.QueryRow(query, mediaID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return media, nil
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
	query := `
		SELECT id, user_id, entry_id, filename, mime_type, size, storage_path,
		       sha256, width, height, validation_status, validation_error, validated_at,
		       client_local_media_id, client_persisted_hash, upload_trace_id, created_at
		FROM media_files
		WHERE entry_id = ?
	`
	rows, err := queryer.Query(query, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*models.MediaFile
	for rows.Next() {
		m, err := scanMediaFile(rows)
		if err != nil {
			return nil, err
		}
		files = append(files, m)
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
	query := `
		SELECT id, user_id, entry_id, filename, mime_type, size, storage_path,
		       sha256, width, height, validation_status, validation_error, validated_at,
		       client_local_media_id, client_persisted_hash, upload_trace_id, created_at
		FROM media_files
		WHERE user_id = ? AND filename = ?
		ORDER BY CASE WHEN entry_id IS NULL THEN 0 ELSE 1 END, created_at DESC
		LIMIT 1
	`
	mediaFile, err := scanMediaFile(r.db.QueryRow(query, userID, filename))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return mediaFile, nil
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

type mediaRowScanner interface {
	Scan(dest ...interface{}) error
}

func scanMediaFile(scanner mediaRowScanner) (*models.MediaFile, error) {
	var (
		media               models.MediaFile
		entryID             sql.NullString
		sha256              sql.NullString
		width               sql.NullInt64
		height              sql.NullInt64
		validationStatus    sql.NullString
		validationError     sql.NullString
		validatedAt         sql.NullString
		clientLocalMediaID  sql.NullString
		clientPersistedHash sql.NullString
		uploadTraceID       sql.NullString
		createdAt           string
	)

	if err := scanner.Scan(
		&media.ID,
		&media.UserID,
		&entryID,
		&media.Filename,
		&media.MimeType,
		&media.Size,
		&media.StoragePath,
		&sha256,
		&width,
		&height,
		&validationStatus,
		&validationError,
		&validatedAt,
		&clientLocalMediaID,
		&clientPersistedHash,
		&uploadTraceID,
		&createdAt,
	); err != nil {
		return nil, err
	}

	if entryID.Valid {
		media.EntryID = &entryID.String
	}
	if sha256.Valid {
		media.SHA256 = sha256.String
	}
	if width.Valid {
		media.Width = int(width.Int64)
	}
	if height.Valid {
		media.Height = int(height.Int64)
	}
	if validationStatus.Valid {
		media.ValidationStatus = validationStatus.String
	}
	if validationError.Valid {
		media.ValidationError = &validationError.String
	}
	if validatedAt.Valid {
		parsed, err := parseSQLiteTime(validatedAt.String)
		if err == nil {
			media.ValidatedAt = &parsed
		}
	}
	if clientLocalMediaID.Valid {
		media.ClientLocalMediaID = clientLocalMediaID.String
	}
	if clientPersistedHash.Valid {
		media.ClientPersistedHash = clientPersistedHash.String
	}
	if uploadTraceID.Valid {
		media.UploadTraceID = uploadTraceID.String
	}
	media.CreatedAt, _ = parseSQLiteTime(createdAt)

	return &media, nil
}
