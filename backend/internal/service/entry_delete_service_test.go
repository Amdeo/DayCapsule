package service

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

func createTestMediaFile(t *testing.T, dir, name string) string {
	t.Helper()

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte("test-media"), 0644); err != nil {
		t.Fatalf("write test media file %s: %v", path, err)
	}
	return path
}

func assertMediaFileDeleted(t *testing.T, mediaRepo *repository.MediaRepository, mediaID string) {
	t.Helper()

	media, err := mediaRepo.GetByID(mediaID)
	if err != nil {
		t.Fatalf("get media %s: %v", mediaID, err)
	}
	if media != nil {
		t.Fatalf("expected media %s to be deleted, got %#v", mediaID, media)
	}
}

func assertPathMissing(t *testing.T, path string) {
	t.Helper()

	_, err := os.Stat(path)
	if !os.IsNotExist(err) {
		t.Fatalf("expected path %s to be removed, stat err=%v", path, err)
	}
}

func TestEntryDeleteService_CascadeDeleteRemovesEntryMediaRowsAndFiles(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-delete-service@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "entry-delete-service-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	mediaDir := t.TempDir()
	photoPath := createTestMediaFile(t, mediaDir, "photo-delete-service.jpg")
	voicePath := createTestMediaFile(t, mediaDir, "voice-delete-service.m4a")
	photo, err := mediaRepo.Create(user.ID, "photo-delete-service.jpg", "image/jpeg", photoPath, 1024)
	if err != nil {
		t.Fatalf("create photo media: %v", err)
	}
	voice, err := mediaRepo.Create(user.ID, "voice-delete-service.m4a", "audio/m4a", voicePath, 2048)
	if err != nil {
		t.Fatalf("create voice media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(photo.ID, "entry-delete-service-1"); err != nil {
		t.Fatalf("link photo media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(voice.ID, "entry-delete-service-1"); err != nil {
		t.Fatalf("link voice media: %v", err)
	}

	svc := NewEntryDeleteService(entryRepo, mediaRepo)
	if err := svc.Delete(user.ID, "entry-delete-service-1"); err != nil {
		t.Fatalf("cascade delete entry: %v", err)
	}

	entry, err := entryRepo.GetByID(user.ID, "entry-delete-service-1")
	if err != nil {
		t.Fatalf("get entry after delete: %v", err)
	}
	if entry != nil {
		t.Fatalf("expected entry to be deleted, got %#v", entry)
	}
	assertMediaFileDeleted(t, mediaRepo, photo.ID)
	assertMediaFileDeleted(t, mediaRepo, voice.ID)
	assertPathMissing(t, photoPath)
	assertPathMissing(t, voicePath)
}

func TestEntryDeleteService_RollsBackWhenFileDeletionFails(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-delete-service-fail@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "entry-delete-service-fail-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	missingPath := filepath.Join(t.TempDir(), "missing-photo.jpg")
	photo, err := mediaRepo.Create(user.ID, "missing-photo.jpg", "image/jpeg", missingPath, 1024)
	if err != nil {
		t.Fatalf("create photo media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(photo.ID, "entry-delete-service-fail-1"); err != nil {
		t.Fatalf("link photo media: %v", err)
	}

	svc := NewEntryDeleteService(entryRepo, mediaRepo)
	if err := svc.Delete(user.ID, "entry-delete-service-fail-1"); err == nil {
		t.Fatal("expected cascade delete to fail when file removal fails")
	}

	entry, err := entryRepo.GetByID(user.ID, "entry-delete-service-fail-1")
	if err != nil {
		t.Fatalf("get entry after failed delete: %v", err)
	}
	if entry == nil {
		t.Fatal("expected entry delete to roll back after file deletion failure")
	}

	media, err := mediaRepo.GetByID(photo.ID)
	if err != nil {
		t.Fatalf("get media after failed delete: %v", err)
	}
	if media == nil {
		t.Fatal("expected media row delete to roll back after file deletion failure")
	}
}

func TestEntryDeleteService_RestoresAlreadyStagedFilesWhenLaterStageFails(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-delete-service-restore@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "entry-delete-service-restore-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	mediaDir := t.TempDir()
	firstPath := createTestMediaFile(t, mediaDir, "restore-first.jpg")
	secondMissingPath := filepath.Join(mediaDir, "restore-second-missing.jpg")
	firstMedia, err := mediaRepo.Create(user.ID, "restore-first.jpg", "image/jpeg", firstPath, 1024)
	if err != nil {
		t.Fatalf("create first media: %v", err)
	}
	secondMedia, err := mediaRepo.Create(user.ID, "restore-second-missing.jpg", "image/jpeg", secondMissingPath, 2048)
	if err != nil {
		t.Fatalf("create second media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(firstMedia.ID, "entry-delete-service-restore-1"); err != nil {
		t.Fatalf("link first media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(secondMedia.ID, "entry-delete-service-restore-1"); err != nil {
		t.Fatalf("link second media: %v", err)
	}

	svc := NewEntryDeleteService(entryRepo, mediaRepo)
	if err := svc.Delete(user.ID, "entry-delete-service-restore-1"); err == nil {
		t.Fatal("expected cascade delete to fail when later media staging fails")
	}

	if _, err := os.Stat(firstPath); err != nil {
		t.Fatalf("expected first file to be restored after staging rollback: %v", err)
	}
	entry, err := entryRepo.GetByID(user.ID, "entry-delete-service-restore-1")
	if err != nil {
		t.Fatalf("get entry after failed staged delete: %v", err)
	}
	if entry == nil {
		t.Fatal("expected entry to remain after staging rollback")
	}
	firstRecord, err := mediaRepo.GetByID(firstMedia.ID)
	if err != nil {
		t.Fatalf("get first media after staged rollback: %v", err)
	}
	if firstRecord == nil {
		t.Fatal("expected first media row to remain after staging rollback")
	}
}

func TestEntryDeleteService_DoesNotFailWhenPostCommitCleanupLeavesStagedFile(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-delete-service-cleanup@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "entry-delete-service-cleanup-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	mediaDir := t.TempDir()
	photoPath := createTestMediaFile(t, mediaDir, "cleanup-photo.jpg")
	photo, err := mediaRepo.Create(user.ID, "cleanup-photo.jpg", "image/jpeg", photoPath, 1024)
	if err != nil {
		t.Fatalf("create photo media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(photo.ID, "entry-delete-service-cleanup-1"); err != nil {
		t.Fatalf("link photo media: %v", err)
	}

	stagedPath := photoPath + ".pending-delete.test"
	svc := NewEntryDeleteService(entryRepo, mediaRepo)
	svc.buildStagedPath = func(path string) string {
		return stagedPath
	}
	svc.removeFile = func(path string) error {
		return errors.New("cleanup failed")
	}

	if err := svc.Delete(user.ID, "entry-delete-service-cleanup-1"); err != nil {
		t.Fatalf("expected delete to succeed even when staged cleanup fails: %v", err)
	}

	entry, err := entryRepo.GetByID(user.ID, "entry-delete-service-cleanup-1")
	if err != nil {
		t.Fatalf("get entry after delete: %v", err)
	}
	if entry != nil {
		t.Fatalf("expected entry to be deleted, got %#v", entry)
	}
	assertMediaFileDeleted(t, mediaRepo, photo.ID)
	assertPathMissing(t, photoPath)
	if _, err := os.Stat(stagedPath); err != nil {
		t.Fatalf("expected staged file to remain for later cleanup: %v", err)
	}
}

func TestEntryDeleteService_ReturnsRestoreErrorWhenStagingRollbackAlsoFails(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-delete-service-restore-fail@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "entry-delete-service-restore-fail-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	mediaDir := t.TempDir()
	firstPath := createTestMediaFile(t, mediaDir, "restore-fail-first.jpg")
	secondPath := createTestMediaFile(t, mediaDir, "restore-fail-second.jpg")
	firstMedia, err := mediaRepo.Create(user.ID, "restore-fail-first.jpg", "image/jpeg", firstPath, 1024)
	if err != nil {
		t.Fatalf("create first media: %v", err)
	}
	secondMedia, err := mediaRepo.Create(user.ID, "restore-fail-second.jpg", "image/jpeg", secondPath, 2048)
	if err != nil {
		t.Fatalf("create second media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(firstMedia.ID, "entry-delete-service-restore-fail-1"); err != nil {
		t.Fatalf("link first media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(secondMedia.ID, "entry-delete-service-restore-fail-1"); err != nil {
		t.Fatalf("link second media: %v", err)
	}

	firstStagedPath := firstPath + ".pending-delete.test-1"
	secondStagedPath := secondPath + ".pending-delete.test-2"
	svc := NewEntryDeleteService(entryRepo, mediaRepo)
	svc.buildStagedPath = func(path string) string {
		if path == firstPath {
			return firstStagedPath
		}
		return secondStagedPath
	}
	svc.renameFile = func(oldPath, newPath string) error {
		switch {
		case oldPath == firstPath && newPath == firstStagedPath:
			return os.Rename(oldPath, newPath)
		case oldPath == secondPath && newPath == secondStagedPath:
			return errors.New("stage second failed")
		case oldPath == firstStagedPath && newPath == firstPath:
			return errors.New("restore first failed")
		default:
			return os.Rename(oldPath, newPath)
		}
	}

	err = svc.Delete(user.ID, "entry-delete-service-restore-fail-1")
	if err == nil {
		t.Fatal("expected delete to fail when staging rollback restore also fails")
	}
	if !strings.Contains(err.Error(), "stage second failed") {
		t.Fatalf("expected error to include stage failure, got %v", err)
	}
	if !strings.Contains(err.Error(), "restore first failed") {
		t.Fatalf("expected error to include restore failure, got %v", err)
	}
}
