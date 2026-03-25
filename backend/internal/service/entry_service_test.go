package service

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/config"
	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

func setupEntryTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "entry-test.db")
	db, err := config.NewDB(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := applySchema(t, db); err != nil {
		t.Fatalf("apply schema: %v", err)
	}
	// Apply entries/media migration
	migPath := filepath.Join("..", "..", "migrations", "002_entries_media.up.sql")
	migSQL, err := os.ReadFile(migPath)
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	if _, err := db.Exec(string(migSQL)); err != nil {
		t.Fatalf("apply migration: %v", err)
	}
	return db
}

func TestEntryServiceCRUD(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://localhost:3000")

	// Create
	resp, err := svc.Create(user.ID, &models.CreateEntryRequest{
		Type:    "text",
		Content: "hello world",
		Tags:    []string{"daily", "test"},
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}
	if resp.ID == "" || resp.Content != "hello world" || resp.Type != "text" {
		t.Fatalf("unexpected entry: %+v", resp)
	}
	if len(resp.Tags) != 2 || resp.Tags[0] != "daily" {
		t.Fatalf("unexpected tags: %v", resp.Tags)
	}
	entryID := resp.ID

	// List
	entries, err := svc.GetPage(user.ID, 20, nil, "", "", nil, nil)
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}
	if len(entries) != 1 || entries[0].ID != entryID {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	// Update
	newContent := "updated content"
	if err := svc.Update(user.ID, entryID, &models.UpdateEntryRequest{Content: &newContent}); err != nil {
		t.Fatalf("update entry: %v", err)
	}

	// List after update — verify content changed
	entries, err = svc.GetPage(user.ID, 20, nil, "", "", nil, nil)
	if err != nil {
		t.Fatalf("list after update: %v", err)
	}
	if entries[0].Content != "updated content" {
		t.Fatalf("expected updated content, got %q", entries[0].Content)
	}

	// Tags
	tags, err := svc.GetAllTags(user.ID)
	if err != nil {
		t.Fatalf("get tags: %v", err)
	}
	if len(tags) != 2 {
		t.Fatalf("expected 2 tags, got %d: %v", len(tags), tags)
	}

	// Delete
	if err := svc.Delete(user.ID, entryID); err != nil {
		t.Fatalf("delete entry: %v", err)
	}

	entries, err = svc.GetPage(user.ID, 20, nil, "", "", nil, nil)
	if err != nil {
		t.Fatalf("list after delete: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries after delete, got %d", len(entries))
	}
}

func TestEntryServiceFilterByType(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, _ := userRepo.Create("filter@example.com", "hashed")

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://localhost:3000")

	svc.Create(user.ID, &models.CreateEntryRequest{Type: "text", Content: "text entry"})
	svc.Create(user.ID, &models.CreateEntryRequest{Type: "photo", Content: "photo entry"})

	textEntries, err := svc.GetPage(user.ID, 20, nil, "text", "", nil, nil)
	if err != nil {
		t.Fatalf("filter by type: %v", err)
	}
	if len(textEntries) != 1 || textEntries[0].Type != "text" {
		t.Fatalf("expected 1 text entry, got %d", len(textEntries))
	}
}

func TestEntryServiceFallsBackToRawMediaJSONWhenLinkedMediaMissing(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("fallback-media@example.com", "hashed")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://localhost:8081")

	now := time.Now().UTC()
	rawMedia := `[{"uri":"file:///documents/photo.jpg","remoteUri":"http://101.43.120.134:8081/api/media/photo-1","mimeType":"image/jpeg","size":2048}]`
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "photo-entry-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "",
		Tags:       "[]",
		Media:      rawMedia,
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("insert from sync: %v", err)
	}

	entries, err := svc.GetPage(user.ID, 20, nil, "photo", "", nil, nil)
	if err != nil {
		t.Fatalf("get page: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 photo entry, got %d", len(entries))
	}
	if len(entries[0].Media) != 1 {
		t.Fatalf("expected 1 media item, got %d", len(entries[0].Media))
	}
	if entries[0].Media[0].URI != "http://101.43.120.134:8081/api/media/photo-1" {
		t.Fatalf("expected fallback remote uri, got %q", entries[0].Media[0].URI)
	}
	if entries[0].Media[0].MimeType != "image/jpeg" {
		t.Fatalf("expected mimeType image/jpeg, got %q", entries[0].Media[0].MimeType)
	}
	if entries[0].Media[0].Size != 2048 {
		t.Fatalf("expected size 2048, got %d", entries[0].Media[0].Size)
	}
}

func TestEntryServiceRecoversHistoricalFileMediaFromUploadedFile(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("recover-file-media@example.com", "hashed")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://101.43.120.134:8081")

	now := time.Now().UTC()
	uploadedMedia, err := mediaRepo.Create(user.ID, "1774401896004_1dnc2z_1774401896136.jpg", "image/jpeg", "/tmp/uploaded-photo.jpg", 4096)
	if err != nil {
		t.Fatalf("create media: %v", err)
	}

	rawMedia := `[{"uri":"file:///data/user/0/com.memorycapsule.app/cache/environments/env_http_101_43_120_134_8081/media/photos/display/1774401896004_1dnc2z_1774401896136.jpg","mimeType":"image/jpeg","size":4096}]`
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "photo-entry-history-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "",
		Tags:       "[]",
		Media:      rawMedia,
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("insert from sync: %v", err)
	}

	entries, err := svc.Export(user.ID)
	if err != nil {
		t.Fatalf("export entries: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if len(entries[0].Media) != 1 {
		t.Fatalf("expected 1 media item, got %d", len(entries[0].Media))
	}

	wantURI := "http://101.43.120.134:8081/api/media/" + uploadedMedia.ID
	if entries[0].Media[0].URI != wantURI {
		t.Fatalf("expected recovered media uri %q, got %q", wantURI, entries[0].Media[0].URI)
	}

	linkedFiles, err := mediaRepo.GetByEntryID("photo-entry-history-1")
	if err != nil {
		t.Fatalf("get linked media: %v", err)
	}
	if len(linkedFiles) != 1 || linkedFiles[0].ID != uploadedMedia.ID {
		t.Fatalf("expected recovered media to be linked to entry, got %#v", linkedFiles)
	}
}
