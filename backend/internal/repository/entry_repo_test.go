package repository

import (
	"database/sql"
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
