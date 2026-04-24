package repository

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/testutil"
)

func setupEntryRepoTestDB(t *testing.T) *sql.DB {
	return testutil.SetupTestDB(t)
}

func seedEntryRepoUser(t *testing.T, db *sql.DB) string {
	t.Helper()

	user, err := NewUserRepository(db).Create("entry-repo@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return user.ID
}

func applyEntryRepoMigration(t *testing.T, db *sql.DB, name string) {
	t.Helper()

	path := filepath.Join("..", "..", "migrations", name)
	sqlBytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration %s: %v", name, err)
	}

	for _, statement := range strings.Split(string(sqlBytes), ";") {
		trimmed := strings.TrimSpace(statement)
		if trimmed == "" {
			continue
		}
		if _, err := db.Exec(trimmed); err != nil {
			t.Fatalf("apply migration %s statement %q: %v", name, trimmed, err)
		}
	}
}

func dropEntryTagsTable(t *testing.T, db *sql.DB) {
	t.Helper()

	if _, err := db.Exec(`DROP TABLE entry_tags`); err != nil {
		t.Fatalf("drop entry_tags table: %v", err)
	}
}

func TestEntryRepository_UpdateFromSyncIfVersionMatches_UpdatesWhenBaseMatches(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	createdAt := time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC)
	baseUpdatedAt := time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC)
	if _, err := repo.InsertFromSync(userID, &models.Entry{
		ID:         "entry-base-match",
		Type:       "text",
		Content:    "server version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  createdAt,
		UpdatedAt:  baseUpdatedAt,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	newUpdatedAt := time.Date(2026, 3, 22, 8, 10, 0, 0, time.UTC)
	result, err := repo.UpdateFromSyncIfVersionMatches(userID, &models.Entry{
		ID:         "entry-base-match",
		Type:       "text",
		Content:    "client version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "pending",
		CreatedAt:  createdAt,
		UpdatedAt:  newUpdatedAt,
	}, baseUpdatedAt)
	if err != nil {
		t.Fatalf("update from sync with matching base: %v", err)
	}

	if result != UpdateFromSyncUpdated {
		t.Fatalf("expected result %q, got %q", UpdateFromSyncUpdated, result)
	}

	persisted, err := repo.GetByID(userID, "entry-base-match")
	if err != nil {
		t.Fatalf("read updated entry: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected updated entry to exist")
	}
	if persisted.Content != "client version" {
		t.Fatalf("expected content to update, got %#v", persisted)
	}
	if !persisted.UpdatedAt.Equal(newUpdatedAt) {
		t.Fatalf("expected updatedAt %v, got %v", newUpdatedAt, persisted.UpdatedAt)
	}
	if persisted.SyncStatus != "synced" {
		t.Fatalf("expected sync_status synced, got %#v", persisted)
	}
}

func TestEntryRepository_UpdateFromSyncIfVersionMatches_ReturnsVersionMismatchWhenBaseDiffers(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	createdAt := time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC)
	serverUpdatedAt := time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC)
	if _, err := repo.InsertFromSync(userID, &models.Entry{
		ID:         "entry-version-mismatch",
		Type:       "text",
		Content:    "server version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  createdAt,
		UpdatedAt:  serverUpdatedAt,
	}); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	result, err := repo.UpdateFromSyncIfVersionMatches(userID, &models.Entry{
		ID:         "entry-version-mismatch",
		Type:       "text",
		Content:    "client version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "pending",
		CreatedAt:  createdAt,
		UpdatedAt:  time.Date(2026, 3, 22, 8, 10, 0, 0, time.UTC),
	}, serverUpdatedAt.Add(-1*time.Minute))
	if err != nil {
		t.Fatalf("update from sync with stale base: %v", err)
	}

	if result != UpdateFromSyncVersionMismatch {
		t.Fatalf("expected result %q, got %q", UpdateFromSyncVersionMismatch, result)
	}

	persisted, err := repo.GetByID(userID, "entry-version-mismatch")
	if err != nil {
		t.Fatalf("read persisted entry: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected persisted entry to exist")
	}
	if persisted.Content != "server version" {
		t.Fatalf("expected content to remain server version, got %#v", persisted)
	}
	if !persisted.UpdatedAt.Equal(serverUpdatedAt) {
		t.Fatalf("expected updatedAt %v, got %v", serverUpdatedAt, persisted.UpdatedAt)
	}
}

func TestEntryRepository_UpdateFromSyncIfVersionMatches_ReturnsMissingWhenEntryIsGone(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	result, err := repo.UpdateFromSyncIfVersionMatches(userID, &models.Entry{
		ID:         "entry-missing",
		Type:       "text",
		Content:    "client version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "pending",
		CreatedAt:  time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 8, 10, 0, 0, time.UTC),
	}, time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("update missing entry from sync: %v", err)
	}

	if result != UpdateFromSyncMissing {
		t.Fatalf("expected result %q, got %q", UpdateFromSyncMissing, result)
	}
}

func TestEntryRepository_InsertFromSync_PopulatesEntryTagsForFilters(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	createdAt := time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC)
	if _, err := repo.InsertFromSync(userID, &models.Entry{
		ID:         "entry-sync-insert-tags",
		Type:       "text",
		Content:    "synced entry",
		Tags:       `["server","sync"]`,
		Media:      "[]",
		SyncStatus: "pending",
		CreatedAt:  createdAt,
		UpdatedAt:  createdAt,
	}); err != nil {
		t.Fatalf("insert from sync: %v", err)
	}

	tags, err := repo.GetAllTags(userID)
	if err != nil {
		t.Fatalf("get all tags: %v", err)
	}
	if len(tags) != 2 || tags[0] != "server" || tags[1] != "sync" {
		t.Fatalf("expected sync tags [server sync], got %v", tags)
	}

	filtered, err := repo.GetPage(userID, 10, nil, "", "", []string{"sync"}, nil)
	if err != nil {
		t.Fatalf("filter by sync tag: %v", err)
	}
	if len(filtered) != 1 || filtered[0].ID != "entry-sync-insert-tags" {
		t.Fatalf("expected filtered sync entry, got %#v", filtered)
	}
}

func TestEntryRepository_UpdateFromSyncIfVersionMatches_ReplacesEntryTagsForFilters(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	created, err := repo.Create(userID, &models.CreateEntryRequest{
		Type:    "text",
		Content: "before sync update",
		Tags:    []string{"legacy"},
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	result, err := repo.UpdateFromSyncIfVersionMatches(userID, &models.Entry{
		ID:         created.ID,
		Type:       created.Type,
		Content:    "after sync update",
		Tags:       `["shared","updated"]`,
		Media:      created.Media,
		SyncStatus: "pending",
		CreatedAt:  created.CreatedAt,
		UpdatedAt:  created.UpdatedAt.Add(time.Minute),
	}, created.UpdatedAt)
	if err != nil {
		t.Fatalf("update from sync: %v", err)
	}
	if result != UpdateFromSyncUpdated {
		t.Fatalf("expected result %q, got %q", UpdateFromSyncUpdated, result)
	}

	tags, err := repo.GetAllTags(userID)
	if err != nil {
		t.Fatalf("get all tags: %v", err)
	}
	if len(tags) != 2 || tags[0] != "shared" || tags[1] != "updated" {
		t.Fatalf("expected replaced tags [shared updated], got %v", tags)
	}

	filteredUpdated, err := repo.GetPage(userID, 10, nil, "", "", []string{"updated"}, nil)
	if err != nil {
		t.Fatalf("filter by updated tag: %v", err)
	}
	if len(filteredUpdated) != 1 || filteredUpdated[0].ID != created.ID {
		t.Fatalf("expected updated-tag filter to return entry, got %#v", filteredUpdated)
	}

	filteredLegacy, err := repo.GetPage(userID, 10, nil, "", "", []string{"legacy"}, nil)
	if err != nil {
		t.Fatalf("filter by legacy tag: %v", err)
	}
	if len(filteredLegacy) != 0 {
		t.Fatalf("expected legacy tag filter to return no entries, got %#v", filteredLegacy)
	}
}

func TestMigration006EntryTags_BackfillsExistingEntries(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	now := time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC)
	if _, err := db.Exec(
		`INSERT INTO entries (id, user_id, type, content, tags, media, sync_status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"entry-migration-backfill",
		userID,
		"text",
		"legacy entry",
		`["imported","legacy","imported"]`,
		"[]",
		"synced",
		now,
		now,
	); err != nil {
		t.Fatalf("insert legacy entry: %v", err)
	}

	if _, err := db.Exec("DELETE FROM entry_tags WHERE entry_id = ?", "entry-migration-backfill"); err != nil {
		t.Fatalf("clear entry_tags: %v", err)
	}

	applyEntryRepoMigration(t, db, "006_entry_tags.up.sql")

	tags, err := repo.GetAllTags(userID)
	if err != nil {
		t.Fatalf("get all tags: %v", err)
	}
	if len(tags) != 2 || tags[0] != "imported" || tags[1] != "legacy" {
		t.Fatalf("expected migration backfill tags [imported legacy], got %v", tags)
	}

	filtered, err := repo.GetPage(userID, 10, nil, "", "", []string{"legacy"}, nil)
	if err != nil {
		t.Fatalf("filter by legacy tag: %v", err)
	}
	if len(filtered) != 1 || filtered[0].ID != "entry-migration-backfill" {
		t.Fatalf("expected migration-backfilled entry, got %#v", filtered)
	}
}

func TestEntryRepository_Create_RollsBackWhenTagSyncFails(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	dropEntryTagsTable(t, db)

	_, err := repo.Create(userID, &models.CreateEntryRequest{
		Type:    "text",
		Content: "should rollback create",
		Tags:    []string{"broken"},
	})
	if err == nil {
		t.Fatal("expected create to fail when entry_tags write fails")
	}

	var count int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM entries WHERE user_id = ? AND content = ?`,
		userID,
		"should rollback create",
	).Scan(&count); err != nil {
		t.Fatalf("count created entries: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected create rollback to leave no entries, got %d", count)
	}
}

func TestEntryRepository_Update_RollsBackWhenTagSyncFails(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	created, err := repo.Create(userID, &models.CreateEntryRequest{
		Type:    "text",
		Content: "before local update",
		Tags:    []string{"before"},
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	dropEntryTagsTable(t, db)

	updatedContent := "after local update"
	if err := repo.Update(userID, created.ID, &models.UpdateEntryRequest{
		Content: &updatedContent,
		Tags:    []string{"after"},
	}); err == nil {
		t.Fatal("expected update to fail when entry_tags write fails")
	}

	persisted, err := repo.GetByID(userID, created.ID)
	if err != nil {
		t.Fatalf("read persisted entry: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected entry to remain after failed update")
	}
	if persisted.Content != "before local update" {
		t.Fatalf("expected content rollback to original value, got %#v", persisted)
	}
	if persisted.Tags != `["before"]` {
		t.Fatalf("expected tags rollback to original value, got %s", persisted.Tags)
	}
}

func TestEntryRepository_InsertFromSync_RollsBackWhenTagSyncFails(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	dropEntryTagsTable(t, db)

	_, err := repo.InsertFromSync(userID, &models.Entry{
		ID:         "entry-sync-rollback",
		Type:       "text",
		Content:    "sync create should rollback",
		Tags:       `["broken"]`,
		Media:      "[]",
		SyncStatus: "pending",
		CreatedAt:  time.Date(2026, 3, 22, 10, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 10, 0, 0, 0, time.UTC),
	})
	if err == nil {
		t.Fatal("expected sync insert to fail when entry_tags write fails")
	}

	persisted, err := repo.GetByID(userID, "entry-sync-rollback")
	if err != nil {
		t.Fatalf("read persisted sync entry: %v", err)
	}
	if persisted != nil {
		t.Fatalf("expected sync insert rollback to leave no entry, got %#v", persisted)
	}
}

func TestEntryRepository_UpdateFromSync_RollsBackWhenTagSyncFails(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	created, err := repo.Create(userID, &models.CreateEntryRequest{
		Type:    "text",
		Content: "before sync update",
		Tags:    []string{"before"},
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	dropEntryTagsTable(t, db)

	if err := repo.UpdateFromSync(userID, &models.Entry{
		ID:         created.ID,
		Type:       created.Type,
		Content:    "after sync update",
		Tags:       `["after"]`,
		Media:      created.Media,
		SyncStatus: "pending",
		CreatedAt:  created.CreatedAt,
		UpdatedAt:  created.UpdatedAt.Add(time.Minute),
	}); err == nil {
		t.Fatal("expected sync update to fail when entry_tags write fails")
	}

	persisted, err := repo.GetByID(userID, created.ID)
	if err != nil {
		t.Fatalf("read persisted sync entry: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected entry to remain after failed sync update")
	}
	if persisted.Content != "before sync update" {
		t.Fatalf("expected sync update rollback to preserve content, got %#v", persisted)
	}
	if persisted.Tags != `["before"]` {
		t.Fatalf("expected sync update rollback to preserve tags, got %s", persisted.Tags)
	}
}

func TestEntryRepository_UpdateFromSyncIfVersionMatches_RollsBackWhenTagSyncFails(t *testing.T) {
	db := setupEntryRepoTestDB(t)
	userID := seedEntryRepoUser(t, db)
	repo := NewEntryRepository(db)

	created, err := repo.Create(userID, &models.CreateEntryRequest{
		Type:    "text",
		Content: "before conditional sync update",
		Tags:    []string{"before"},
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	dropEntryTagsTable(t, db)

	result, err := repo.UpdateFromSyncIfVersionMatches(userID, &models.Entry{
		ID:         created.ID,
		Type:       created.Type,
		Content:    "after conditional sync update",
		Tags:       `["after"]`,
		Media:      created.Media,
		SyncStatus: "pending",
		CreatedAt:  created.CreatedAt,
		UpdatedAt:  created.UpdatedAt.Add(time.Minute),
	}, created.UpdatedAt)
	if err == nil {
		t.Fatal("expected conditional sync update to fail when entry_tags write fails")
	}
	if result != "" {
		t.Fatalf("expected empty match result on failure, got %q", result)
	}

	persisted, err := repo.GetByID(userID, created.ID)
	if err != nil {
		t.Fatalf("read persisted conditional sync entry: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected entry to remain after failed conditional sync update")
	}
	if persisted.Content != "before conditional sync update" {
		t.Fatalf("expected conditional sync rollback to preserve content, got %#v", persisted)
	}
	if persisted.Tags != `["before"]` {
		t.Fatalf("expected conditional sync rollback to preserve tags, got %s", persisted.Tags)
	}
}
