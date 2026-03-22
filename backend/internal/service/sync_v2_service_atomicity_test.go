package service

import (
	"context"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

type fakeSyncV2EntryStore struct {
	getByIDResults []*models.Entry
	getByIDCalls   int

	updateResult      repository.UpdateFromSyncMatchResult
	updateCalls       int
	lastUpdatedEntry  *models.Entry
	lastBaseUpdatedAt time.Time
}

func (f *fakeSyncV2EntryStore) GetByID(_, _ string) (*models.Entry, error) {
	if f.getByIDCalls >= len(f.getByIDResults) {
		f.getByIDCalls++
		return nil, nil
	}
	result := f.getByIDResults[f.getByIDCalls]
	f.getByIDCalls++
	return result, nil
}

func (f *fakeSyncV2EntryStore) InsertFromSync(_ string, entry *models.Entry) (*models.Entry, error) {
	return entry, nil
}

func (f *fakeSyncV2EntryStore) UpdateFromSyncIfVersionMatches(_ string, entry *models.Entry, baseUpdatedAt time.Time) (repository.UpdateFromSyncMatchResult, error) {
	f.updateCalls++
	copied := *entry
	f.lastUpdatedEntry = &copied
	f.lastBaseUpdatedAt = baseUpdatedAt
	return f.updateResult, nil
}

func (f *fakeSyncV2EntryStore) Delete(_, _ string) error {
	return nil
}

type fakeSyncV2ChangeStore struct {
	appendCalls int
}

func (f *fakeSyncV2ChangeStore) AppendChange(context.Context, string, string, *models.Entry) (int64, error) {
	f.appendCalls++
	return 1, nil
}

func (f *fakeSyncV2ChangeStore) ListSinceCursor(context.Context, string, int64, int) ([]*models.EntryChange, error) {
	return nil, nil
}

func TestSyncV2Service_UpdateReturnsConflictedWithFreshServerEntryAfterVersionMismatch(t *testing.T) {
	baseUpdatedAt := time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC)
	initialServer := &models.Entry{
		ID:        "entry-1",
		Type:      "text",
		Content:   "server before race",
		Tags:      "[]",
		Media:     "[]",
		CreatedAt: time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt: baseUpdatedAt,
	}
	latestServer := &models.Entry{
		ID:        "entry-1",
		Type:      "text",
		Content:   "server after race",
		Tags:      "[]",
		Media:     "[]",
		CreatedAt: initialServer.CreatedAt,
		UpdatedAt: time.Date(2026, 3, 22, 8, 7, 0, 0, time.UTC),
	}

	entryStore := &fakeSyncV2EntryStore{
		getByIDResults: []*models.Entry{initialServer, latestServer},
		updateResult:   repository.UpdateFromSyncVersionMismatch,
	}
	changeStore := &fakeSyncV2ChangeStore{}
	svc := newSyncV2Service(entryStore, changeStore)

	resp, err := svc.Sync(context.Background(), "user-1", &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID:      "local-update-1",
				Op:            "update",
				BaseUpdatedAt: &baseUpdatedAt,
				Entry: models.Entry{
					ID:      "entry-1",
					Type:    "text",
					Content: "client version",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	if len(resp.Results) != 1 || resp.Results[0].Status != "conflicted" {
		t.Fatalf("expected conflicted result, got %#v", resp.Results)
	}
	if len(resp.Conflicts) != 1 {
		t.Fatalf("expected one conflict, got %#v", resp.Conflicts)
	}
	if resp.Conflicts[0].ServerEntry.Content != "server after race" {
		t.Fatalf("expected fresh server entry in conflict, got %#v", resp.Conflicts[0].ServerEntry)
	}
	if resp.Conflicts[0].ClientEntry.Content != "client version" {
		t.Fatalf("expected client entry in conflict, got %#v", resp.Conflicts[0].ClientEntry)
	}
	if entryStore.updateCalls != 1 {
		t.Fatalf("expected one conditional update call, got %d", entryStore.updateCalls)
	}
	if changeStore.appendCalls != 0 {
		t.Fatalf("expected no change append for conflict, got %d", changeStore.appendCalls)
	}
}

func TestSyncV2Service_UpdateReturnsIgnoredWhenConditionalUpdateReportsMissing(t *testing.T) {
	baseUpdatedAt := time.Date(2026, 3, 22, 8, 5, 0, 0, time.UTC)
	initialServer := &models.Entry{
		ID:        "entry-1",
		Type:      "text",
		Content:   "server before delete",
		Tags:      "[]",
		Media:     "[]",
		CreatedAt: time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt: baseUpdatedAt,
	}

	entryStore := &fakeSyncV2EntryStore{
		getByIDResults: []*models.Entry{initialServer, nil},
		updateResult:   repository.UpdateFromSyncMissing,
	}
	changeStore := &fakeSyncV2ChangeStore{}
	svc := newSyncV2Service(entryStore, changeStore)

	resp, err := svc.Sync(context.Background(), "user-1", &SyncRequest{
		Cursor:   0,
		DeviceID: "device-1",
		ClientChanges: []ClientChange{
			{
				ChangeID:      "local-update-1",
				Op:            "update",
				BaseUpdatedAt: &baseUpdatedAt,
				Entry: models.Entry{
					ID:      "entry-1",
					Type:    "text",
					Content: "client version",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("sync: %v", err)
	}

	if len(resp.Results) != 1 || resp.Results[0].Status != "ignored" {
		t.Fatalf("expected ignored result, got %#v", resp.Results)
	}
	if len(resp.Conflicts) != 0 {
		t.Fatalf("expected no conflicts, got %#v", resp.Conflicts)
	}
	if entryStore.updateCalls != 1 {
		t.Fatalf("expected one conditional update call, got %d", entryStore.updateCalls)
	}
	if changeStore.appendCalls != 0 {
		t.Fatalf("expected no change append for missing result, got %d", changeStore.appendCalls)
	}
}
