package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/google/uuid"
)

type EntryRepository struct {
	db *sql.DB
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
			conditions = append(conditions, "tags LIKE ?")
			args = append(args, fmt.Sprintf("%%\"%s\"%%", tag))
		}
	}

	where := strings.Join(conditions, " AND ")
	query := fmt.Sprintf(`
		SELECT id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at
		FROM entries
		WHERE %s
		ORDER BY created_at DESC
		LIMIT ?
	`, where)
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
	query := `
		SELECT id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at
		FROM entries
		WHERE id = ? AND user_id = ?
	`
	var entry models.Entry
	var createdAt, updatedAt string
	err := r.db.QueryRow(query, entryID, userID).Scan(
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

	query := fmt.Sprintf("UPDATE entries SET %s WHERE id = ? AND user_id = ?", strings.Join(sets, ", "))
	result, err := r.db.Exec(query, args...)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("entry not found")
	}
	return nil
}

func (r *EntryRepository) Delete(userID, entryID string) error {
	result, err := r.db.Exec("DELETE FROM entries WHERE id = ? AND user_id = ?", entryID, userID)
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
	rows, err := r.db.Query("SELECT tags FROM entries WHERE user_id = ?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tagSet := make(map[string]bool)
	for rows.Next() {
		var tagsJSON string
		if err := rows.Scan(&tagsJSON); err != nil {
			return nil, err
		}
		var tags []string
		if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
			continue
		}
		for _, t := range tags {
			tagSet[t] = true
		}
	}

	var result []string
	for t := range tagSet {
		result = append(result, t)
	}
	return result, rows.Err()
}

func (r *EntryRepository) Count(userID string) (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM entries WHERE user_id = ?", userID).Scan(&count)
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
	_, err := r.db.Exec(query,
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
	if entry.UpdatedAt.IsZero() {
		entry.UpdatedAt = time.Now().UTC()
	}

	result, err := r.db.Exec(
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

	existing, err := r.GetByID(userID, entry.ID)
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
