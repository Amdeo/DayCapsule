package repository

import (
	"database/sql"
	"errors"

	"github.com/daycapsule/backend/internal/models"
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
		SELECT id, user_id, data_hash, entry_count, device_name,
		       encrypted, encryption_version, created_at, updated_at
		FROM backups
		WHERE user_id = $1
	`
	err := r.db.QueryRow(query, userID).Scan(
		&backup.ID, &backup.UserID, &backup.DataHash, &backup.EntryCount,
		&backup.DeviceName, &backup.Encrypted, &backup.EncryptionVersion,
		&backup.CreatedAt, &backup.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return backup, nil
}

func (r *BackupRepository) Upsert(backup *models.Backup) error {
	query := `
		INSERT INTO backups (user_id, data_json, data_hash, entry_count, device_name, encrypted, encryption_version)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE SET
			data_json = EXCLUDED.data_json,
			data_hash = EXCLUDED.data_hash,
			entry_count = EXCLUDED.entry_count,
			device_name = EXCLUDED.device_name,
			encrypted = EXCLUDED.encrypted,
			encryption_version = EXCLUDED.encryption_version,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(query,
		backup.UserID, backup.DataJSON, backup.DataHash, backup.EntryCount,
		backup.DeviceName, backup.Encrypted, backup.EncryptionVersion,
	).Scan(&backup.ID, &backup.CreatedAt, &backup.UpdatedAt)
}

func (r *BackupRepository) Delete(userID string) error {
	query := `DELETE FROM backups WHERE user_id = $1`
	_, err := r.db.Exec(query, userID)
	return err
}
