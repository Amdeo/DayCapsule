package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/google/uuid"
)

type BackupRepository struct {
	db *sql.DB
}

func NewBackupRepository(db *sql.DB) *BackupRepository {
	return &BackupRepository{db: db}
}

func (r *BackupRepository) GetByUserID(userID string) (*models.Backup, error) {
	backup := &models.Backup{}
	query := `
		SELECT id, user_id, data_json, data_hash, entry_count, device_name,
		       encrypted, encryption_version, created_at, updated_at
		FROM backups
		WHERE user_id = ?
	`
	var createdAt, updatedAt string
	err := r.db.QueryRow(query, userID).Scan(
		&backup.ID, &backup.UserID, &backup.DataJSON, &backup.DataHash, &backup.EntryCount,
		&backup.DeviceName, &backup.Encrypted, &backup.EncryptionVersion,
		&createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	backup.CreatedAt, err = parseSQLiteTime(createdAt)
	if err != nil {
		return nil, err
	}
	backup.UpdatedAt, err = parseSQLiteTime(updatedAt)
	if err != nil {
		return nil, err
	}
	return backup, nil
}

func (r *BackupRepository) Upsert(backup *models.Backup) error {
	now := time.Now().UTC()
	existing, err := r.GetByUserID(backup.UserID)
	if err != nil {
		return err
	}
	if existing != nil {
		backup.ID = existing.ID
		backup.CreatedAt = existing.CreatedAt
	} else {
		if backup.ID == "" {
			backup.ID = uuid.NewString()
		}
		if backup.CreatedAt.IsZero() {
			backup.CreatedAt = now
		}
	}
	backup.UpdatedAt = now

	query := `
		INSERT INTO backups (id, user_id, data_json, data_hash, entry_count, device_name, encrypted, encryption_version, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			data_json = excluded.data_json,
			data_hash = excluded.data_hash,
			entry_count = excluded.entry_count,
			device_name = excluded.device_name,
			encrypted = excluded.encrypted,
			encryption_version = excluded.encryption_version,
			updated_at = excluded.updated_at
	`
	_, err = r.db.Exec(query,
		backup.ID, backup.UserID, backup.DataJSON, backup.DataHash, backup.EntryCount,
		backup.DeviceName, backup.Encrypted, backup.EncryptionVersion, backup.CreatedAt, backup.UpdatedAt,
	)
	return err
}

func (r *BackupRepository) Delete(userID string) error {
	query := `DELETE FROM backups WHERE user_id = ?`
	_, err := r.db.Exec(query, userID)
	return err
}
