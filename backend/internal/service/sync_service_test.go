package service

import (
	"database/sql"
	"testing"

	"github.com/daycapsule/backend/internal/config"
	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
	"path/filepath"
)

func setupSyncTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "sync-test.db")
	db, err := config.NewDB(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := applySchema(t, db); err != nil {
		t.Fatalf("apply schema: %v", err)
	}

	return db
}

func TestSyncServiceUploadDownloadWithSQLite(t *testing.T) {
	db := setupSyncTestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("sync@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create sync user: %v", err)
	}

	syncService := NewSyncService(repository.NewBackupRepository(db))

	uploadReq := &models.UploadRequest{
		Data: models.BackupData{
			Entries: []map[string]interface{}{
				{"id": "entry-1", "content": "hello"},
			},
			Tags: []map[string]interface{}{
				{"id": "tag-1", "name": "daily"},
			},
			Version: 1,
		},
		Hash:              "hash-123",
		EntryCount:        1,
		DeviceName:        "iPhone",
		Encrypted:         false,
		EncryptionVersion: 0,
	}

	if err := syncService.Upload(user.ID, uploadReq); err != nil {
		t.Fatalf("upload backup: %v", err)
	}

	status, err := syncService.GetStatus(user.ID)
	if err != nil {
		t.Fatalf("get status: %v", err)
	}

	if !status.HasBackup || status.Hash != "hash-123" || status.EntryCount != 1 {
		t.Fatalf("unexpected status: %#v", status)
	}

	downloadedData, hash, _, err := syncService.Download(user.ID)
	if err != nil {
		t.Fatalf("download backup: %v", err)
	}

	if hash != "hash-123" {
		t.Fatalf("expected hash-123, got %q", hash)
	}

	if len(downloadedData.Entries) != 1 || downloadedData.Entries[0]["content"] != "hello" {
		t.Fatalf("unexpected downloaded entries: %#v", downloadedData.Entries)
	}
}

func generateAccessTokenForTest(userID, email, secret string) (string, error) {
	return generateTokenForTest(userID, email, secret, "access")
}
