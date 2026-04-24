package service

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/daycapsule/backend/internal/config"
	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

func setupSyncOverviewTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "sync-overview-test.db")
	db, err := config.NewDB(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := applySchema(t, db); err != nil {
		t.Fatalf("apply schema: %v", err)
	}
	return db
}

func TestSyncOverviewService_GetByUser(t *testing.T) {
	db := setupSyncOverviewTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	userA, err := userRepo.Create("overview-a@example.com", "hashed")
	if err != nil {
		t.Fatalf("create userA: %v", err)
	}
	userB, err := userRepo.Create("overview-b@example.com", "hashed")
	if err != nil {
		t.Fatalf("create userB: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)

	textEntry, err := entryRepo.Create(userA.ID, &models.CreateEntryRequest{Type: "text", Content: "text"})
	if err != nil {
		t.Fatalf("create text entry: %v", err)
	}
	if _, err := entryRepo.Create(userA.ID, &models.CreateEntryRequest{Type: "photo", Content: "photo"}); err != nil {
		t.Fatalf("create photo entry: %v", err)
	}
	if _, err := entryRepo.Create(userA.ID, &models.CreateEntryRequest{Type: "voice", Content: "voice"}); err != nil {
		t.Fatalf("create voice entry: %v", err)
	}
	if err := entryRepo.Delete(userA.ID, textEntry.ID); err != nil {
		t.Fatalf("delete text entry: %v", err)
	}
	if _, err := entryRepo.Create(userB.ID, &models.CreateEntryRequest{Type: "photo", Content: "other user"}); err != nil {
		t.Fatalf("create userB entry: %v", err)
	}

	media1, err := mediaRepo.Create(userA.ID, "p1.jpg", "image/jpeg", "/tmp/p1.jpg", 100)
	if err != nil {
		t.Fatalf("create media1: %v", err)
	}
	if _, err := mediaRepo.Create(userA.ID, "v1.m4a", "audio/mp4", "/tmp/v1.m4a", 200); err != nil {
		t.Fatalf("create media2: %v", err)
	}
	if _, err := mediaRepo.Create(userA.ID, "p2.jpg", "image/jpeg", "/tmp/p2.jpg", 300); err != nil {
		t.Fatalf("create media3: %v", err)
	}
	if _, err := mediaRepo.Create(userA.ID, "tmp.bin", "application/octet-stream", "/tmp/tmp.bin", 999); err != nil {
		t.Fatalf("create media4: %v", err)
	}
	if err := mediaRepo.Delete(userA.ID, media1.ID); err != nil {
		t.Fatalf("delete media1: %v", err)
	}
	if _, err := mediaRepo.Create(userB.ID, "other.jpg", "image/jpeg", "/tmp/other.jpg", 888); err != nil {
		t.Fatalf("create userB media: %v", err)
	}

	svc := NewSyncOverviewService(entryRepo, mediaRepo)
	overview, err := svc.GetByUser(userA.ID)
	if err != nil {
		t.Fatalf("get overview: %v", err)
	}

	if overview.EntryCount != 2 {
		t.Fatalf("expected entryCount=2, got %d", overview.EntryCount)
	}
	if overview.PhotoCount != 1 {
		t.Fatalf("expected photoCount=1, got %d", overview.PhotoCount)
	}
	if overview.VoiceCount != 1 {
		t.Fatalf("expected voiceCount=1, got %d", overview.VoiceCount)
	}
	if overview.MediaCount != 3 {
		t.Fatalf("expected mediaCount=3, got %d", overview.MediaCount)
	}
	if overview.MediaBytes != 1499 {
		t.Fatalf("expected mediaBytes=1499, got %d", overview.MediaBytes)
	}
}

func TestSyncOverviewService_GetByUser_Empty(t *testing.T) {
	db := setupSyncOverviewTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	user, err := repository.NewUserRepository(db).Create("overview-empty@example.com", "hashed")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	svc := NewSyncOverviewService(repository.NewEntryRepository(db), repository.NewMediaRepository(db))
	overview, err := svc.GetByUser(user.ID)
	if err != nil {
		t.Fatalf("get overview: %v", err)
	}

	if overview.EntryCount != 0 || overview.PhotoCount != 0 || overview.VoiceCount != 0 || overview.MediaCount != 0 || overview.MediaBytes != 0 {
		t.Fatalf("expected all zero overview, got %#v", overview)
	}
}
