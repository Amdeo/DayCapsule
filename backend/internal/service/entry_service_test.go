package service

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

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
