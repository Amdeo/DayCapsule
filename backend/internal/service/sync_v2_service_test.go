package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/config"
	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

type syncV2ClientChangePayload struct {
	ChangeID      string       `json:"changeId"`
	Op            string       `json:"op"`
	BaseUpdatedAt *time.Time   `json:"baseUpdatedAt,omitempty"`
	Entry         models.Entry `json:"entry"`
}

type syncV2RequestPayload struct {
	Cursor        int64                       `json:"cursor"`
	DeviceID      string                      `json:"deviceId"`
	ClientChanges []syncV2ClientChangePayload `json:"clientChanges"`
}

type syncV2ResponseView struct {
	NewCursor int64 `json:"newCursor"`
	Results   []struct {
		ChangeID string `json:"changeId"`
		Status   string `json:"status"`
		EntryID  string `json:"entryId"`
	} `json:"results"`
	ServerChanges []struct {
		ChangeID  int64        `json:"changeId"`
		Op        string       `json:"op"`
		Entry     models.Entry `json:"entry"`
		ChangedAt time.Time    `json:"changedAt"`
	} `json:"serverChanges"`
	Conflicts []struct {
		ChangeID    string        `json:"changeId"`
		EntryID     string        `json:"entryId"`
		Reason      string        `json:"reason"`
		ServerEntry *models.Entry `json:"serverEntry"`
		ClientEntry *models.Entry `json:"clientEntry"`
	} `json:"conflicts"`
}

func setupSyncV2TestDB(t *testing.T) *sql.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "sync-v2-test.db")
	db, err := config.NewDB(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := applySchema(t, db); err != nil {
		t.Fatalf("apply schema: %v", err)
	}
	for _, migration := range []string{"002_entries_media.up.sql", "003_entry_changes.up.sql"} {
		path := filepath.Join("..", "..", "migrations", migration)
		sqlBytes, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read migration %s: %v", migration, err)
		}
		if _, err := db.Exec(string(sqlBytes)); err != nil {
			t.Fatalf("apply migration %s: %v", migration, err)
		}
	}

	return db
}

func decodeSyncV2Response(t *testing.T, resp *SyncResponse) syncV2ResponseView {
	t.Helper()

	raw, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	var view syncV2ResponseView
	if err := json.Unmarshal(raw, &view); err != nil {
		t.Fatalf("unmarshal response view: %v", err)
	}
	return view
}

func countEntryChangesForEntry(t *testing.T, db *sql.DB, userID, entryID string) int {
	t.Helper()

	var count int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM entry_changes WHERE user_id = ? AND entry_id = ?`,
		userID, entryID,
	).Scan(&count); err != nil {
		t.Fatalf("count entry changes for %s: %v", entryID, err)
	}
	return count
}

func mustSyncV2Request(t *testing.T, payload syncV2RequestPayload) *SyncRequest {
	t.Helper()

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var req SyncRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	return &req
}

func TestSyncV2Service_ResultSemantics(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		seed      func(t *testing.T, entryRepo *repository.EntryRepository, userID string) (*time.Time, *models.Entry)
		payload   syncV2RequestPayload
		assertion func(t *testing.T, view syncV2ResponseView)
	}{
		{
			name: "create returns applied",
			seed: func(t *testing.T, entryRepo *repository.EntryRepository, userID string) (*time.Time, *models.Entry) {
				return nil, nil
			},
			payload: syncV2RequestPayload{
				Cursor:   0,
				DeviceID: "device-1",
				ClientChanges: []syncV2ClientChangePayload{
					{
						ChangeID: "local-create-1",
						Op:       "create",
						Entry: models.Entry{
							ID:      "entry-create-1",
							Type:    "text",
							Content: "hello create",
						},
					},
				},
			},
			assertion: func(t *testing.T, view syncV2ResponseView) {
				t.Helper()
				if len(view.Results) != 1 {
					t.Fatalf("expected 1 result, got %#v", view.Results)
				}
				if view.Results[0].ChangeID != "local-create-1" || view.Results[0].Status != "applied" || view.Results[0].EntryID != "entry-create-1" {
					t.Fatalf("unexpected create result: %#v", view.Results[0])
				}
			},
		},
		{
			name: "update returns conflicted when server is newer",
			seed: func(t *testing.T, entryRepo *repository.EntryRepository, userID string) (*time.Time, *models.Entry) {
				t.Helper()

				now := time.Now().UTC()
				entry := &models.Entry{
					ID:         "entry-update-1",
					Type:       "text",
					Content:    "server version",
					Tags:       "[]",
					Media:      "[]",
					SyncStatus: "synced",
					CreatedAt:  now.Add(-2 * time.Hour),
					UpdatedAt:  now,
					UserID:     "",
				}
				saved, err := entryRepo.InsertFromSync(userID, entry)
				if err != nil {
					t.Fatalf("seed entry: %v", err)
				}
				base := now.Add(-1 * time.Hour)
				return &base, saved
			},
			payload: syncV2RequestPayload{
				Cursor:   0,
				DeviceID: "device-1",
				ClientChanges: []syncV2ClientChangePayload{
					{
						ChangeID: "local-update-1",
						Op:       "update",
						Entry: models.Entry{
							ID:      "entry-update-1",
							Type:    "text",
							Content: "client version",
						},
					},
				},
			},
			assertion: func(t *testing.T, view syncV2ResponseView) {
				t.Helper()
				if len(view.Results) != 1 {
					t.Fatalf("expected 1 result, got %#v", view.Results)
				}
				if view.Results[0].ChangeID != "local-update-1" || view.Results[0].Status != "conflicted" || view.Results[0].EntryID != "entry-update-1" {
					t.Fatalf("unexpected update result: %#v", view.Results[0])
				}
				if len(view.Conflicts) != 1 {
					t.Fatalf("expected 1 conflict, got %#v", view.Conflicts)
				}
				if view.Conflicts[0].ChangeID != "local-update-1" || view.Conflicts[0].EntryID != "entry-update-1" || view.Conflicts[0].Reason != "server_newer_than_base" {
					t.Fatalf("unexpected conflict metadata: %#v", view.Conflicts[0])
				}
				if view.Conflicts[0].ServerEntry == nil || view.Conflicts[0].ClientEntry == nil {
					t.Fatalf("expected serverEntry and clientEntry in conflict, got %#v", view.Conflicts[0])
				}
				if view.Conflicts[0].ServerEntry.Content != "server version" || view.Conflicts[0].ClientEntry.Content != "client version" {
					t.Fatalf("unexpected conflict entries: server=%#v client=%#v", view.Conflicts[0].ServerEntry, view.Conflicts[0].ClientEntry)
				}
			},
		},
		{
			name: "delete returns ignored when entry is missing",
			seed: func(t *testing.T, entryRepo *repository.EntryRepository, userID string) (*time.Time, *models.Entry) {
				return nil, nil
			},
			payload: syncV2RequestPayload{
				Cursor:   0,
				DeviceID: "device-1",
				ClientChanges: []syncV2ClientChangePayload{
					{
						ChangeID: "local-delete-1",
						Op:       "delete",
						Entry: models.Entry{
							ID: "entry-missing-1",
						},
					},
				},
			},
			assertion: func(t *testing.T, view syncV2ResponseView) {
				t.Helper()
				if len(view.Results) != 1 {
					t.Fatalf("expected 1 result, got %#v", view.Results)
				}
				if view.Results[0].ChangeID != "local-delete-1" || view.Results[0].Status != "ignored" || view.Results[0].EntryID != "entry-missing-1" {
					t.Fatalf("unexpected delete result: %#v", view.Results[0])
				}
			},
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			db := setupSyncV2TestDB(t)
			t.Cleanup(func() {
				_ = db.Close()
			})

			userRepo := repository.NewUserRepository(db)
			user, err := userRepo.Create("user-1@example.com", "hashed-password")
			if err != nil {
				t.Fatalf("seed user: %v", err)
			}

			entryRepo := repository.NewEntryRepository(db)
			changeRepo := repository.NewChangeRepository(db)
			svc := NewSyncV2Service(entryRepo, changeRepo)

			baseUpdatedAt, _ := tt.seed(t, entryRepo, user.ID)
			if baseUpdatedAt != nil && len(tt.payload.ClientChanges) > 0 {
				tt.payload.ClientChanges[0].BaseUpdatedAt = baseUpdatedAt
			}

			req := mustSyncV2Request(t, tt.payload)
			resp, err := svc.Sync(context.Background(), user.ID, req)
			if err != nil {
				t.Fatalf("sync: %v", err)
			}

			view := decodeSyncV2Response(t, resp)
			tt.assertion(t, view)
		})
	}
}

func TestSyncV2Service_DoesNotAppendChangeLogForIgnoredDelete(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	svc := NewSyncV2Service(repository.NewEntryRepository(db), repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "local-delete-1",
				Op:       "delete",
				Entry: models.Entry{
					ID: "entry-missing-1",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 || view.Results[0].Status != "ignored" {
		t.Fatalf("expected ignored delete result, got %#v", view.Results)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-missing-1"); got != 0 {
		t.Fatalf("expected no change log for ignored delete, got %d", got)
	}
}

func TestSyncV2Service_AppendsChangeLogForAppliedDelete(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	existing := &models.Entry{
		ID:         "entry-delete-1",
		Type:       "text",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC),
	}
	if _, err := entryRepo.InsertFromSync(user.ID, existing); err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	svc := NewSyncV2Service(entryRepo, repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "local-delete-1",
				Op:       "delete",
				Entry: models.Entry{
					ID: "entry-delete-1",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 || view.Results[0].Status != "applied" {
		t.Fatalf("expected applied delete result, got %#v", view.Results)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-delete-1"); got != 1 {
		t.Fatalf("expected one change log for applied delete, got %d", got)
	}
}

func TestSyncV2Service_DoesNotAppendChangeLogForConflictedUpdate(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	now := time.Now().UTC()
	entry := &models.Entry{
		ID:         "entry-update-1",
		Type:       "text",
		Content:    "server version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  now.Add(-2 * time.Hour),
		UpdatedAt:  now,
	}
	if _, err := entryRepo.InsertFromSync(user.ID, entry); err != nil {
		t.Fatalf("seed entry: %v", err)
	}
	baseUpdatedAt := now.Add(-1 * time.Hour)

	svc := NewSyncV2Service(entryRepo, repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID:      "local-update-1",
				Op:            "update",
				BaseUpdatedAt: &baseUpdatedAt,
				Entry: models.Entry{
					ID:      "entry-update-1",
					Type:    "text",
					Content: "client version",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 || view.Results[0].Status != "conflicted" {
		t.Fatalf("expected conflicted update result, got %#v", view.Results)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-update-1"); got != 0 {
		t.Fatalf("expected no change log for conflicted update, got %d", got)
	}
}

func TestSyncV2Service_AppendsChangeLogForAppliedCreate(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	svc := NewSyncV2Service(repository.NewEntryRepository(db), repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "local-create-1",
				Op:       "create",
				Entry: models.Entry{
					ID:      "entry-create-1",
					Type:    "text",
					Content: "hello create",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 || view.Results[0].Status != "applied" {
		t.Fatalf("expected applied create result, got %#v", view.Results)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-create-1"); got != 1 {
		t.Fatalf("expected one change log for applied create, got %d", got)
	}
}

func TestSyncV2Service_EmptyClientChangesSerializesResultsAsEmptyArray(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	svc := NewSyncV2Service(repository.NewEntryRepository(db), repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:        0,
		DeviceID:      "device-1",
		ClientChanges: nil,
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if view.Results == nil {
		t.Fatal("expected results to be serialized as an empty array, got null")
	}
	if len(view.Results) != 0 {
		t.Fatalf("expected zero results, got %#v", view.Results)
	}
}

func TestSyncV2Service_UpdateSuccessUsesPersistedSnapshot(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	createdAt := time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC)
	_, err = db.Exec(
		`INSERT INTO entries (id, user_id, type, content, tags, media, recording_status, recording_duration, sync_status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"entry-update-1",
		user.ID,
		"text",
		"server version",
		"[]",
		"[]",
		nil,
		nil,
		"synced",
		createdAt,
		updatedAt,
	)
	if err != nil {
		t.Fatalf("seed entry row: %v", err)
	}

	svc := NewSyncV2Service(repository.NewEntryRepository(db), repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "local-update-1",
				Op:       "update",
				Entry: models.Entry{
					ID:      "entry-update-1",
					Type:    "text",
					Content: "client version",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 {
		t.Fatalf("expected 1 result, got %#v", view.Results)
	}
	if view.Results[0].Status != "applied" {
		t.Fatalf("expected applied result, got %#v", view.Results[0])
	}
	if len(view.ServerChanges) != 1 {
		t.Fatalf("expected 1 server change, got %#v", view.ServerChanges)
	}
	serverEntry := view.ServerChanges[0].Entry
	if serverEntry.ID != "entry-update-1" || serverEntry.UserID != user.ID || serverEntry.Type != "text" {
		t.Fatalf("unexpected persisted snapshot: %#v", serverEntry)
	}
	if !serverEntry.CreatedAt.Equal(createdAt) {
		t.Fatalf("expected createdAt %v, got %v", createdAt, serverEntry.CreatedAt)
	}
	if serverEntry.Content != "client version" {
		t.Fatalf("expected updated content to be persisted, got %#v", serverEntry)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-update-1"); got != 1 {
		t.Fatalf("expected one change log for applied update, got %d", got)
	}
}

func TestSyncV2Service_UpdateCreatesEntryWhenServerRowIsMissing(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	baseUpdatedAt := time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC)
	svc := NewSyncV2Service(repository.NewEntryRepository(db), repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID:      "local-update-missing-1",
				Op:            "update",
				BaseUpdatedAt: &baseUpdatedAt,
				Entry: models.Entry{
					ID:      "entry-created-from-update",
					Type:    "text",
					Content: "created via update",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 || view.Results[0].Status != "applied" {
		t.Fatalf("expected applied update result, got %#v", view.Results)
	}

	entryRepo := repository.NewEntryRepository(db)
	persisted, err := entryRepo.GetByID(user.ID, "entry-created-from-update")
	if err != nil {
		t.Fatalf("read created entry: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected missing update to create entry")
	}
	if persisted.Content != "created via update" {
		t.Fatalf("expected created content to match client entry, got %#v", persisted)
	}

	if got := countEntryChangesForEntry(t, db, user.ID, "entry-created-from-update"); got != 1 {
		t.Fatalf("expected one change log for create-via-update, got %d", got)
	}

	var op string
	if err := db.QueryRow(
		`SELECT op FROM entry_changes WHERE user_id = ? AND entry_id = ? ORDER BY change_id DESC LIMIT 1`,
		user.ID,
		"entry-created-from-update",
	).Scan(&op); err != nil {
		t.Fatalf("read latest change op: %v", err)
	}
	if op != "create" {
		t.Fatalf("expected create change log for missing update, got %q", op)
	}
}

func TestSyncV2Service_CreateRollsBackWhenChangeAppendFails(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-create-rollback@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	if _, err := db.Exec(`DROP TABLE entry_changes`); err != nil {
		t.Fatalf("drop entry_changes: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	svc := NewSyncV2Service(entryRepo, repository.NewChangeRepository(db))
	_, err = svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "create-rollback-1",
				Op:       "create",
				Entry: models.Entry{
					ID:      "entry-create-rollback",
					Type:    "text",
					Content: "should rollback",
				},
			},
		},
	})
	if err == nil {
		t.Fatal("expected sync to fail when change log append fails")
	}

	persisted, err := entryRepo.GetByID(user.ID, "entry-create-rollback")
	if err != nil {
		t.Fatalf("read entry after failed create: %v", err)
	}
	if persisted != nil {
		t.Fatalf("expected create to roll back, got %#v", persisted)
	}
}

func TestSyncV2Service_UpdateRollsBackWhenChangeAppendFails(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-update-rollback@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	existing := &models.Entry{
		ID:         "entry-update-rollback",
		Type:       "text",
		Content:    "server version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC),
	}
	if _, err := entryRepo.InsertFromSync(user.ID, existing); err != nil {
		t.Fatalf("seed entry: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE entry_changes`); err != nil {
		t.Fatalf("drop entry_changes: %v", err)
	}

	baseUpdatedAt := existing.UpdatedAt
	svc := NewSyncV2Service(entryRepo, repository.NewChangeRepository(db))
	_, err = svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID:      "update-rollback-1",
				Op:            "update",
				BaseUpdatedAt: &baseUpdatedAt,
				Entry: models.Entry{
					ID:      "entry-update-rollback",
					Type:    "text",
					Content: "client version",
				},
			},
		},
	})
	if err == nil {
		t.Fatal("expected sync to fail when change log append fails")
	}

	persisted, err := entryRepo.GetByID(user.ID, "entry-update-rollback")
	if err != nil {
		t.Fatalf("read entry after failed update: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected original entry to remain after failed update")
	}
	if persisted.Content != "server version" {
		t.Fatalf("expected update to roll back, got %#v", persisted)
	}
}

func TestSyncV2Service_DeleteRollsBackWhenChangeAppendFails(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-delete-rollback@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	existing := &models.Entry{
		ID:         "entry-delete-rollback",
		Type:       "text",
		Content:    "delete me",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC),
	}
	if _, err := entryRepo.InsertFromSync(user.ID, existing); err != nil {
		t.Fatalf("seed entry: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE entry_changes`); err != nil {
		t.Fatalf("drop entry_changes: %v", err)
	}

	svc := NewSyncV2Service(entryRepo, repository.NewChangeRepository(db))
	_, err = svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "delete-rollback-1",
				Op:       "delete",
				Entry: models.Entry{
					ID: "entry-delete-rollback",
				},
			},
		},
	})
	if err == nil {
		t.Fatal("expected sync to fail when change log append fails")
	}

	persisted, err := entryRepo.GetByID(user.ID, "entry-delete-rollback")
	if err != nil {
		t.Fatalf("read entry after failed delete: %v", err)
	}
	if persisted == nil {
		t.Fatal("expected delete to roll back and keep original entry")
	}
}

func TestSyncV2Service_DoesNotAppendChangeLogForIgnoredCreateWhenEntryExists(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	existing := &models.Entry{
		ID:         "entry-existing-1",
		Type:       "text",
		Content:    "server version",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC),
	}
	if _, err := entryRepo.InsertFromSync(user.ID, existing); err != nil {
		t.Fatalf("seed existing entry: %v", err)
	}

	svc := NewSyncV2Service(entryRepo, repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "local-create-existing-1",
				Op:       "create",
				Entry: models.Entry{
					ID:      "entry-existing-1",
					Type:    "text",
					Content: "client version",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 1 || view.Results[0].Status != "ignored" {
		t.Fatalf("expected ignored create result, got %#v", view.Results)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-existing-1"); got != 0 {
		t.Fatalf("expected no change log for ignored create, got %d", got)
	}
}

func TestSyncV2Service_IgnoresInvalidClientChangesWithResults(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	svc := NewSyncV2Service(repository.NewEntryRepository(db), repository.NewChangeRepository(db))
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID: "bad-unknown-op",
				Op:       "nonsense",
				Entry: models.Entry{
					ID:      "entry-1",
					Type:    "text",
					Content: "ignored",
				},
			},
			{
				ChangeID: "bad-empty-id",
				Op:       "create",
				Entry: models.Entry{
					Type:    "text",
					Content: "ignored",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.Results) != 2 {
		t.Fatalf("expected 2 results, got %#v", view.Results)
	}
	if view.Results[0].ChangeID != "bad-unknown-op" || view.Results[0].Status != "ignored" || view.Results[0].EntryID != "entry-1" {
		t.Fatalf("unexpected ignored result for unknown op: %#v", view.Results[0])
	}
	if view.Results[1].ChangeID != "bad-empty-id" || view.Results[1].Status != "ignored" || view.Results[1].EntryID != "" {
		t.Fatalf("unexpected ignored result for empty id: %#v", view.Results[1])
	}
	if got := countEntryChangesForEntry(t, db, user.ID, "entry-1"); got != 0 {
		t.Fatalf("expected no change log for unknown op, got %d", got)
	}
	if got := countEntryChangesForEntry(t, db, user.ID, ""); got != 0 {
		t.Fatalf("expected no change log for empty entry id, got %d", got)
	}
}

func TestSyncV2Service_ReturnsAllChangesWhenCursorIsZero(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	otherUser, err := userRepo.Create("user-2@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed other user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	changeRepo := repository.NewChangeRepository(db)

	seedEntry := func(entryID, content string) *models.Entry {
		t.Helper()

		now := time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC)
		entry := &models.Entry{
			ID:         entryID,
			Type:       "text",
			Content:    content,
			Tags:       "[]",
			Media:      "[]",
			SyncStatus: "synced",
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		saved, err := entryRepo.InsertFromSync(user.ID, entry)
		if err != nil {
			t.Fatalf("seed entry %s: %v", entryID, err)
		}
		return saved
	}

	firstEntry := seedEntry("entry-change-1", "first")
	secondEntry := seedEntry("entry-change-2", "second")

	firstChangeID, err := changeRepo.AppendChange(context.Background(), user.ID, "create", firstEntry)
	if err != nil {
		t.Fatalf("append first change: %v", err)
	}
	secondChangeID, err := changeRepo.AppendChange(context.Background(), user.ID, "create", secondEntry)
	if err != nil {
		t.Fatalf("append second change: %v", err)
	}
	if _, err := changeRepo.AppendChange(context.Background(), otherUser.ID, "create", &models.Entry{
		ID:         "entry-other-user",
		Type:       "text",
		Content:    "other user",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC),
		UserID:     otherUser.ID,
	}); err != nil {
		t.Fatalf("append other user's change: %v", err)
	}

	svc := NewSyncV2Service(entryRepo, changeRepo)
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:        0,
		DeviceID:      "device-1",
		ClientChanges: nil,
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.ServerChanges) != 2 {
		t.Fatalf("expected 2 server changes for current user, got %#v", view.ServerChanges)
	}
	if view.ServerChanges[0].ChangeID != firstChangeID || view.ServerChanges[1].ChangeID != secondChangeID {
		t.Fatalf("unexpected change ordering or ids: %#v", view.ServerChanges)
	}
	if view.NewCursor != secondChangeID {
		t.Fatalf("expected newCursor to advance to %d, got %d", secondChangeID, view.NewCursor)
	}
}

func TestSyncV2Service_KeepsCursorWhenNoNewChanges(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	entryRepo := repository.NewEntryRepository(db)
	changeRepo := repository.NewChangeRepository(db)

	entry := &models.Entry{
		ID:         "entry-change-1",
		Type:       "text",
		Content:    "first",
		Tags:       "[]",
		Media:      "[]",
		SyncStatus: "synced",
		CreatedAt:  time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC),
		UpdatedAt:  time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC),
	}
	saved, err := entryRepo.InsertFromSync(user.ID, entry)
	if err != nil {
		t.Fatalf("seed entry: %v", err)
	}
	changeID, err := changeRepo.AppendChange(context.Background(), user.ID, "create", saved)
	if err != nil {
		t.Fatalf("append change: %v", err)
	}

	svc := NewSyncV2Service(entryRepo, changeRepo)
	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:        changeID,
		DeviceID:      "device-1",
		ClientChanges: nil,
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.ServerChanges) != 0 {
		t.Fatalf("expected no new server changes, got %#v", view.ServerChanges)
	}
	if view.NewCursor != changeID {
		t.Fatalf("expected newCursor to remain %d, got %d", changeID, view.NewCursor)
	}
}

func TestSyncV2Service_ReturnsAllServerChangesAcrossCursorBatches(t *testing.T) {
	db := setupSyncV2TestDB(t)
	t.Cleanup(func() {
		_ = db.Close()
	})

	userRepo := repository.NewUserRepository(db)
	user, err := userRepo.Create("user-1@example.com", "hashed-password")
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	changeRepo := repository.NewChangeRepository(db)
	entryRepo := repository.NewEntryRepository(db)
	svc := NewSyncV2Service(entryRepo, changeRepo)

	now := time.Now().UTC()
	for i := 0; i < 501; i++ {
		entry := &models.Entry{
			ID:         fmt.Sprintf("entry-batch-%03d", i),
			Type:       "text",
			Content:    "batch entry",
			Tags:       "[]",
			Media:      "[]",
			SyncStatus: "synced",
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if _, err := changeRepo.AppendChange(context.Background(), user.ID, "create", entry); err != nil {
			t.Fatalf("append change %d: %v", i, err)
		}
	}

	resp, err := svc.Sync(context.Background(), user.ID, &SyncRequest{
		Cursor:        0,
		DeviceID:      "device-1",
		ClientChanges: []ClientChange{},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	view := decodeSyncV2Response(t, resp)
	if len(view.ServerChanges) != 501 {
		t.Fatalf("expected 501 server changes, got %d", len(view.ServerChanges))
	}
	if view.NewCursor != 501 {
		t.Fatalf("expected newCursor=501, got %d", view.NewCursor)
	}
}
