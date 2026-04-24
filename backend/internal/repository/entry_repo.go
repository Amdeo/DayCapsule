package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/google/uuid"
)

var ErrEntryNotFound = errors.New("entry not found")

type EntryRepository struct {
	db *sql.DB
}

type entryQueryRower interface {
	QueryRow(query string, args ...interface{}) *sql.Row
}

type entryExecer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

type UpdateFromSyncMatchResult string

const (
	UpdateFromSyncUpdated         UpdateFromSyncMatchResult = "updated"
	UpdateFromSyncVersionMismatch UpdateFromSyncMatchResult = "version_mismatch"
	UpdateFromSyncMissing         UpdateFromSyncMatchResult = "missing"
)

func NewEntryRepository(db *sql.DB) *EntryRepository {
	return &EntryRepository{db: db}
}

func (r *EntryRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}

func (r *EntryRepository) Create(userID string, req *models.CreateEntryRequest) (*models.Entry, error) {
	now := time.Now().UTC()
	id := uuid.NewString()

	tagsJSON, _ := json.Marshal(req.Tags)
	if req.Tags == nil {
		tagsJSON = []byte("[]")
	}

	mediaJSON := []byte("[]")
	if len(req.MediaIDs) > 0 {
		mediaJSON, _ = json.Marshal(req.MediaIDs)
	}

	entry := &models.Entry{
		ID:                id,
		UserID:            userID,
		Type:              req.Type,
		Content:           req.Content,
		Tags:              string(tagsJSON),
		Media:             string(mediaJSON),
		RecordingStatus:   req.RecordingStatus,
		RecordingDuration: req.RecordingDuration,
		SyncStatus:        "synced",
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	query := `
		INSERT INTO entries (id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.Exec(query,
		entry.ID, entry.UserID, entry.Type, entry.Content, entry.Tags, entry.Media,
		entry.RecordingStatus, entry.RecordingDuration, entry.SyncStatus,
		entry.CreatedAt, entry.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err := r.replaceTags(r.db, entry.ID, userID, req.Tags); err != nil {
		return nil, err
	}

	return entry, nil
}

func (r *EntryRepository) GetPage(userID string, limit int, cursor *int64, entryType, search string, tags []string, startTime *int64) ([]*models.Entry, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "user_id = ?")
	args = append(args, userID)

	if cursor != nil && *cursor > 0 {
		conditions = append(conditions, "created_at < ?")
		cursorTime := time.UnixMilli(*cursor).UTC()
		args = append(args, cursorTime)
	}

	if entryType != "" {
		conditions = append(conditions, "type = ?")
		args = append(args, entryType)
	}

	if search != "" {
		conditions = append(conditions, "content LIKE ?")
		args = append(args, "%"+search+"%")
	}

	if startTime != nil && *startTime > 0 {
		conditions = append(conditions, "created_at >= ?")
		st := time.UnixMilli(*startTime).UTC()
		args = append(args, st)
	}

	if len(tags) > 0 {
		for _, tag := range tags {
			conditions = append(conditions, "EXISTS (SELECT 1 FROM entry_tags et WHERE et.entry_id = entries.id AND et.tag = ?)")
			args = append(args, tag)
		}
	}

	where := strings.Join(conditions, " AND ")
	const selectColumns = "id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at"
	query := "SELECT " + selectColumns + " FROM entries WHERE " + where + " ORDER BY created_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.Entry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *EntryRepository) GetByID(userID, entryID string) (*models.Entry, error) {
	return r.getByID(r.db, userID, entryID)
}

func (r *EntryRepository) GetByIDTx(tx *sql.Tx, userID, entryID string) (*models.Entry, error) {
	return r.getByID(tx, userID, entryID)
}

func (r *EntryRepository) getByID(queryer entryQueryRower, userID, entryID string) (*models.Entry, error) {
	query := `
		SELECT id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at
		FROM entries
		WHERE id = ? AND user_id = ?
	`
	var entry models.Entry
	var createdAt, updatedAt string
	err := queryer.QueryRow(query, entryID, userID).Scan(
		&entry.ID, &entry.UserID, &entry.Type, &entry.Content, &entry.Tags, &entry.Media,
		&entry.RecordingStatus, &entry.RecordingDuration, &entry.SyncStatus,
		&createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	entry.CreatedAt, _ = parseSQLiteTime(createdAt)
	entry.UpdatedAt, _ = parseSQLiteTime(updatedAt)
	return &entry, nil
}

func (r *EntryRepository) Update(userID, entryID string, req *models.UpdateEntryRequest) error {
	var sets []string
	var args []interface{}

	if req.Content != nil {
		sets = append(sets, "content = ?")
		args = append(args, *req.Content)
	}
	if req.Tags != nil {
		tagsJSON, _ := json.Marshal(req.Tags)
		sets = append(sets, "tags = ?")
		args = append(args, string(tagsJSON))
	}
	if req.RecordingStatus != nil {
		sets = append(sets, "recording_status = ?")
		args = append(args, *req.RecordingStatus)
	}
	if req.RecordingDuration != nil {
		sets = append(sets, "recording_duration = ?")
		args = append(args, *req.RecordingDuration)
	}

	if len(sets) == 0 {
		return nil
	}

	sets = append(sets, "updated_at = ?")
	args = append(args, time.Now().UTC())
	args = append(args, entryID, userID)

	query := "UPDATE entries SET " + strings.Join(sets, ", ") + " WHERE id = ? AND user_id = ?"
	result, err := r.db.Exec(query, args...)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrEntryNotFound
	}

	if req.Tags != nil {
		if err := r.replaceTags(r.db, entryID, userID, req.Tags); err != nil {
			return err
		}
	}

	return nil
}

func (r *EntryRepository) Delete(userID, entryID string) error {
	return r.delete(r.db, userID, entryID)
}

func (r *EntryRepository) DeleteTx(tx *sql.Tx, userID, entryID string) error {
	return r.delete(tx, userID, entryID)
}

func (r *EntryRepository) delete(execer entryExecer, userID, entryID string) error {
	result, err := execer.Exec("DELETE FROM entries WHERE id = ? AND user_id = ?", entryID, userID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("entry not found")
	}
	return nil
}

func (r *EntryRepository) DeleteAll(userID string) error {
	_, err := r.db.Exec("DELETE FROM entries WHERE user_id = ?", userID)
	return err
}

func (r *EntryRepository) GetAllTags(userID string) ([]string, error) {
	rows, err := r.db.Query("SELECT DISTINCT tag FROM entry_tags WHERE user_id = ? ORDER BY tag", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		result = append(result, tag)
	}
	return result, rows.Err()
}

func (r *EntryRepository) Count(userID string) (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM entries WHERE user_id = ?", userID).Scan(&count)
	return count, err
}

func (r *EntryRepository) CountByType(userID, entryType string) (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM entries WHERE user_id = ? AND type = ?", userID, entryType).Scan(&count)
	return count, err
}

func (r *EntryRepository) GetAll(userID string) ([]*models.Entry, error) {
	query := `
		SELECT id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at
		FROM entries
		WHERE user_id = ?
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.Entry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *EntryRepository) InsertFromSync(userID string, entry *models.Entry) (*models.Entry, error) {
	return r.insertFromSync(r.db, userID, entry)
}

func (r *EntryRepository) InsertFromSyncTx(tx *sql.Tx, userID string, entry *models.Entry) (*models.Entry, error) {
	return r.insertFromSync(tx, userID, entry)
}

func (r *EntryRepository) insertFromSync(execer entryExecer, userID string, entry *models.Entry) (*models.Entry, error) {
	// 使用客户端提供的 ID；若为空则生成一个新的
	if entry.ID == "" {
		entry.ID = uuid.NewString()
	}

	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now().UTC()
	}
	if entry.UpdatedAt.IsZero() {
		entry.UpdatedAt = entry.CreatedAt
	}

	query := `
		INSERT INTO entries (id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := execer.Exec(query,
		entry.ID,
		userID,
		entry.Type,
		entry.Content,
		entry.Tags,
		entry.Media,
		entry.RecordingStatus,
		entry.RecordingDuration,
		"synced",
		entry.CreatedAt,
		entry.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	entry.UserID = userID
	entry.SyncStatus = "synced"
	return entry, nil
}

func (r *EntryRepository) UpdateFromSync(userID string, entry *models.Entry) error {
	if entry.UpdatedAt.IsZero() {
		entry.UpdatedAt = time.Now().UTC()
	}

	query := `UPDATE entries SET content = ?, tags = ?, media = ?, recording_status = ?, recording_duration = ?, sync_status = ?, updated_at = ?
	          WHERE id = ? AND user_id = ?`
	_, err := r.db.Exec(query,
		entry.Content,
		entry.Tags,
		entry.Media,
		entry.RecordingStatus,
		entry.RecordingDuration,
		"synced",
		entry.UpdatedAt,
		entry.ID,
		userID,
	)
	return err
}

func (r *EntryRepository) UpdateFromSyncIfVersionMatches(userID string, entry *models.Entry, baseUpdatedAt time.Time) (UpdateFromSyncMatchResult, error) {
	return r.updateFromSyncIfVersionMatches(r.db, func(entryID string) (*models.Entry, error) {
		return r.GetByID(userID, entryID)
	}, userID, entry, baseUpdatedAt)
}

func (r *EntryRepository) UpdateFromSyncIfVersionMatchesTx(tx *sql.Tx, userID string, entry *models.Entry, baseUpdatedAt time.Time) (UpdateFromSyncMatchResult, error) {
	return r.updateFromSyncIfVersionMatches(tx, func(entryID string) (*models.Entry, error) {
		return r.GetByIDTx(tx, userID, entryID)
	}, userID, entry, baseUpdatedAt)
}

func (r *EntryRepository) updateFromSyncIfVersionMatches(
	execer entryExecer,
	getByID func(entryID string) (*models.Entry, error),
	userID string,
	entry *models.Entry,
	baseUpdatedAt time.Time,
) (UpdateFromSyncMatchResult, error) {
	if entry.UpdatedAt.IsZero() {
		entry.UpdatedAt = time.Now().UTC()
	}

	result, err := execer.Exec(
		`UPDATE entries
		 SET content = ?, tags = ?, media = ?, recording_status = ?, recording_duration = ?, sync_status = ?, updated_at = ?
		 WHERE id = ? AND user_id = ? AND updated_at = ?`,
		entry.Content,
		entry.Tags,
		entry.Media,
		entry.RecordingStatus,
		entry.RecordingDuration,
		"synced",
		entry.UpdatedAt,
		entry.ID,
		userID,
		baseUpdatedAt,
	)
	if err != nil {
		return "", err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return "", err
	}
	if rows == 1 {
		return UpdateFromSyncUpdated, nil
	}

	existing, err := getByID(entry.ID)
	if err != nil {
		return "", err
	}
	if existing == nil {
		return UpdateFromSyncMissing, nil
	}

	return UpdateFromSyncVersionMismatch, nil
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func (r *EntryRepository) replaceTags(execer entryExecer, entryID, userID string, tags []string) error {
	if _, err := execer.Exec("DELETE FROM entry_tags WHERE entry_id = ?", entryID); err != nil {
		return err
	}
	for _, tag := range tags {
		if tag == "" {
			continue
		}
		if _, err := execer.Exec("INSERT INTO entry_tags (entry_id, tag, user_id) VALUES (?, ?, ?)", entryID, tag, userID); err != nil {
			return err
		}
	}
	return nil
}

func scanEntry(s scannable) (*models.Entry, error) {
	var entry models.Entry
	var createdAt, updatedAt string
	err := s.Scan(
		&entry.ID, &entry.UserID, &entry.Type, &entry.Content, &entry.Tags, &entry.Media,
		&entry.RecordingStatus, &entry.RecordingDuration, &entry.SyncStatus,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	entry.CreatedAt, _ = parseSQLiteTime(createdAt)
	entry.UpdatedAt, _ = parseSQLiteTime(updatedAt)
	return &entry, nil
}
