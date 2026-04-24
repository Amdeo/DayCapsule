package service

import (
	"database/sql"
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

func TestEntryServiceExport_IncludesRemoteHashAndValidationStatus(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-export-media@example.com", "hashed")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://localhost:8081")

	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "photo-entry-export-1",
		UserID:     user.ID,
		Type:       "photo",
		Content:    "",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		t.Fatalf("insert from sync: %v", err)
	}

	media, err := mediaRepo.CreateWithMetadata(
		user.ID,
		"photo-export.jpg",
		"image/jpeg",
		"/tmp/photo-export.jpg",
		4096,
		models.MediaFileCreateInput{
			SHA256:           "sha256-good",
			Width:            1200,
			Height:           900,
			ValidationStatus: "healthy",
		},
	)
	if err != nil {
		t.Fatalf("create media with metadata: %v", err)
	}
	if err := mediaRepo.LinkToEntry(media.ID, "photo-entry-export-1"); err != nil {
		t.Fatalf("link media: %v", err)
	}

	entries, err := svc.Export(user.ID)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if len(entries) != 1 || len(entries[0].Media) != 1 {
		t.Fatalf("expected one exported media item, got %#v", entries)
	}
	if entries[0].Media[0].RemoteHash != "sha256-good" {
		t.Fatalf("expected remote hash to be returned")
	}
	if entries[0].Media[0].ValidationStatus != "healthy" {
		t.Fatalf("expected validation status healthy, got %q", entries[0].Media[0].ValidationStatus)
	}
	if entries[0].Media[0].Width == nil || *entries[0].Media[0].Width != 1200 {
		t.Fatalf("expected width 1200, got %#v", entries[0].Media[0].Width)
	}
	if entries[0].Media[0].Height == nil || *entries[0].Media[0].Height != 900 {
		t.Fatalf("expected height 900, got %#v", entries[0].Media[0].Height)
	}
}

func TestEntryServiceRecoversMissingMediaWhenOnlyPartiallyLinked(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("recover-partial-media@example.com", "hashed")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://101.43.120.134:8081")

	now := time.Now().UTC()
	firstMedia, err := mediaRepo.Create(user.ID, "photo-1.jpg", "image/jpeg", "/tmp/photo-1.jpg", 1024)
	if err != nil {
		t.Fatalf("create first media: %v", err)
	}
	secondMedia, err := mediaRepo.Create(user.ID, "photo-2.jpg", "image/jpeg", "/tmp/photo-2.jpg", 2048)
	if err != nil {
		t.Fatalf("create second media: %v", err)
	}

	rawMedia := `[{"uri":"file:///data/user/0/com.memorycapsule.app/cache/environments/env_http_101_43_120_134_8081/media/photos/display/photo-1.jpg","mimeType":"image/jpeg","size":1024},{"uri":"file:///data/user/0/com.memorycapsule.app/cache/environments/env_http_101_43_120_134_8081/media/photos/display/photo-2.jpg","mimeType":"image/jpeg","size":2048}]`
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "photo-entry-partial-1",
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
	if err := mediaRepo.LinkToEntry(firstMedia.ID, "photo-entry-partial-1"); err != nil {
		t.Fatalf("link first media: %v", err)
	}

	entries, err := svc.Export(user.ID)
	if err != nil {
		t.Fatalf("export entries: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if len(entries[0].Media) != 2 {
		t.Fatalf("expected 2 media items after partial recovery, got %d", len(entries[0].Media))
	}

	wantFirstURI := "http://101.43.120.134:8081/api/media/" + firstMedia.ID
	wantSecondURI := "http://101.43.120.134:8081/api/media/" + secondMedia.ID
	if entries[0].Media[0].URI != wantFirstURI {
		t.Fatalf("expected first media uri %q, got %q", wantFirstURI, entries[0].Media[0].URI)
	}
	if entries[0].Media[1].URI != wantSecondURI {
		t.Fatalf("expected second media uri %q, got %q", wantSecondURI, entries[0].Media[1].URI)
	}

	linkedFiles, err := mediaRepo.GetByEntryID("photo-entry-partial-1")
	if err != nil {
		t.Fatalf("get linked media: %v", err)
	}
	if len(linkedFiles) != 2 {
		t.Fatalf("expected both media files to be linked after recovery, got %#v", linkedFiles)
	}
}

func TestEntryServiceDeleteCascadesLinkedMediaRowsAndFiles(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("entry-delete-cascade@example.com", "hashed")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://localhost:3000")

	now := time.Now().UTC()
	if _, err := entryRepo.InsertFromSync(user.ID, &models.Entry{
		ID:         "entry-delete-cascade-1",
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

	mediaPath := createTestMediaFile(t, t.TempDir(), "entry-service-delete-photo.jpg")
	media, err := mediaRepo.Create(user.ID, "entry-service-delete-photo.jpg", "image/jpeg", mediaPath, 2048)
	if err != nil {
		t.Fatalf("create media: %v", err)
	}
	if err := mediaRepo.LinkToEntry(media.ID, "entry-delete-cascade-1"); err != nil {
		t.Fatalf("link media: %v", err)
	}

	if err := svc.Delete(user.ID, "entry-delete-cascade-1"); err != nil {
		t.Fatalf("delete entry: %v", err)
	}

	entry, err := entryRepo.GetByID(user.ID, "entry-delete-cascade-1")
	if err != nil {
		t.Fatalf("get entry after delete: %v", err)
	}
	if entry != nil {
		t.Fatalf("expected entry to be deleted, got %#v", entry)
	}
	assertMediaFileDeleted(t, mediaRepo, media.ID)
	assertPathMissing(t, mediaPath)
}

func TestEntryServiceCreate_DoesNotLinkForeignUserMedia(t *testing.T) {
	db := setupEntryTestDB(t)
	t.Cleanup(func() { _ = db.Close() })

	userRepo := repository.NewUserRepository(db)
	owner, err := userRepo.Create("owner@example.com", "hashed")
	if err != nil {
		t.Fatalf("create owner: %v", err)
	}
	attacker, err := userRepo.Create("attacker@example.com", "hashed")
	if err != nil {
		t.Fatalf("create attacker: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	svc := NewEntryService(entryRepo, mediaRepo, "http://localhost:3000")

	foreignMedia, err := mediaRepo.Create(owner.ID, "foreign.jpg", "image/jpeg", "/tmp/foreign.jpg", 2048)
	if err != nil {
		t.Fatalf("create foreign media: %v", err)
	}

	resp, err := svc.Create(attacker.ID, &models.CreateEntryRequest{
		Type:     "photo",
		Content:  "attempt foreign bind",
		MediaIDs: []string{foreignMedia.ID},
	})
	if err != nil {
		t.Fatalf("create attacker entry: %v", err)
	}
	if len(resp.Media) != 0 {
		t.Fatalf("expected no linked media in response, got %#v", resp.Media)
	}

	storedMedia, err := mediaRepo.GetByID(foreignMedia.ID)
	if err != nil {
		t.Fatalf("reload foreign media: %v", err)
	}
	if storedMedia == nil {
		t.Fatal("expected foreign media to still exist")
	}
	if storedMedia.EntryID != nil {
		t.Fatalf("expected foreign media to remain unlinked, got entry_id=%q", *storedMedia.EntryID)
	}
}
