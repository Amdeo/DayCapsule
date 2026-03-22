package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type syncV2HandlerStubService struct {
	resp  *service.SyncResponse
	err   error
	calls int
}

func (s *syncV2HandlerStubService) Sync(_ context.Context, _ string, _ *service.SyncRequest) (*service.SyncResponse, error) {
	s.calls++
	return s.resp, s.err
}

type syncV2HandlerEnvelope struct {
	Success bool                       `json:"success"`
	Error   map[string]json.RawMessage `json:"error"`
	Data    map[string]json.RawMessage `json:"data"`
}

func performSyncV2Request(t *testing.T, handler *SyncV2Handler, body string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/sync", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("userID", "user-1")

	handler.Sync(ctx)
	return recorder
}

func decodeEnvelope(t *testing.T, recorder *httptest.ResponseRecorder) syncV2HandlerEnvelope {
	t.Helper()

	var envelope syncV2HandlerEnvelope
	if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	return envelope
}

func mustRawValue[T any](t *testing.T, raw json.RawMessage, v *T) {
	t.Helper()

	if err := json.Unmarshal(raw, v); err != nil {
		t.Fatalf("unmarshal raw value: %v", err)
	}
}

func TestSyncV2Handler_Returns400ForInvalidJSON(t *testing.T) {
	handler := NewSyncV2Handler(&syncV2HandlerStubService{})
	recorder := performSyncV2Request(t, handler, `{"cursor":`)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if envelope.Success {
		t.Fatal("expected success=false for invalid JSON")
	}
	if got := string(envelope.Error["code"]); got != `"INVALID_REQUEST"` {
		t.Fatalf("expected INVALID_REQUEST error code, got %s", got)
	}
}

func TestSyncV2Handler_Returns400ForMissingDeviceID(t *testing.T) {
	stub := &syncV2HandlerStubService{}
	handler := NewSyncV2Handler(stub)
	recorder := performSyncV2Request(t, handler, `{"cursor":0,"clientChanges":[]}`)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if envelope.Success {
		t.Fatal("expected success=false for invalid request")
	}
	if got := string(envelope.Error["code"]); got != `"INVALID_REQUEST"` {
		t.Fatalf("expected INVALID_REQUEST error code, got %s", got)
	}
	if stub.calls != 0 {
		t.Fatalf("expected service not to be called, got %d calls", stub.calls)
	}
}

func TestSyncV2Handler_Returns400ForMissingClientChanges(t *testing.T) {
	stub := &syncV2HandlerStubService{}
	handler := NewSyncV2Handler(stub)
	recorder := performSyncV2Request(t, handler, `{"cursor":0,"deviceId":"device-1"}`)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if envelope.Success {
		t.Fatal("expected success=false for invalid request")
	}
	if got := string(envelope.Error["code"]); got != `"INVALID_REQUEST"` {
		t.Fatalf("expected INVALID_REQUEST error code, got %s", got)
	}
	if stub.calls != 0 {
		t.Fatalf("expected service not to be called, got %d calls", stub.calls)
	}
}

func TestSyncV2Handler_Returns400ForUpdateWithoutBaseUpdatedAt(t *testing.T) {
	stub := &syncV2HandlerStubService{}
	handler := NewSyncV2Handler(stub)
	recorder := performSyncV2Request(t, handler, `{
		"cursor":0,
		"deviceId":"device-1",
		"clientChanges":[
			{
				"changeId":"local-update-1",
				"op":"update",
				"entry":{"id":"entry-1","type":"text","content":"client version"}
			}
		]
	}`)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if envelope.Success {
		t.Fatal("expected success=false for invalid update request")
	}
	if got := string(envelope.Error["code"]); got != `"INVALID_REQUEST"` {
		t.Fatalf("expected INVALID_REQUEST error code, got %s", got)
	}
	if stub.calls != 0 {
		t.Fatalf("expected service not to be called, got %d calls", stub.calls)
	}
}

func TestSyncV2Handler_Returns500WhenServiceFails(t *testing.T) {
	handler := NewSyncV2Handler(&syncV2HandlerStubService{err: errors.New("boom")})
	recorder := performSyncV2Request(t, handler, `{"cursor":0,"deviceId":"device-1","clientChanges":[]}`)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if envelope.Success {
		t.Fatal("expected success=false for internal error")
	}
	if got := string(envelope.Error["code"]); got != `"INTERNAL_ERROR"` {
		t.Fatalf("expected INTERNAL_ERROR error code, got %s", got)
	}
}

func TestSyncV2Handler_ReturnsSuccessEnvelopeWithEmptyArrays(t *testing.T) {
	handler := NewSyncV2Handler(&syncV2HandlerStubService{
		resp: &service.SyncResponse{
			NewCursor: 12,
		},
	})

	recorder := performSyncV2Request(t, handler, `{"cursor":0,"deviceId":"device-1","clientChanges":[]}`)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if !envelope.Success {
		t.Fatal("expected success=true")
	}

	for _, key := range []string{"newCursor", "results", "serverChanges", "conflicts"} {
		if _, ok := envelope.Data[key]; !ok {
			t.Fatalf("expected data.%s to exist, got %#v", key, envelope.Data)
		}
	}

	if got := string(envelope.Data["newCursor"]); got != "12" {
		t.Fatalf("expected newCursor=12, got %s", got)
	}
	if got := string(envelope.Data["results"]); got != "[]" {
		t.Fatalf("expected data.results to be [], got %s", got)
	}
	if got := string(envelope.Data["serverChanges"]); got != "[]" {
		t.Fatalf("expected data.serverChanges to be [], got %s", got)
	}
	if got := string(envelope.Data["conflicts"]); got != "[]" {
		t.Fatalf("expected data.conflicts to be [], got %s", got)
	}
}

func TestSyncV2Handler_UsesServiceResponseAsData(t *testing.T) {
	serverChangedAt := "2026-03-22T08:00:00Z"
	handler := NewSyncV2Handler(&syncV2HandlerStubService{
		resp: &service.SyncResponse{
			NewCursor: 7,
			Results: []service.SyncResult{
				{ChangeID: "local-1", Status: "applied", EntryID: "entry-1"},
			},
			ServerChanges: []service.ServerChange{
				{
					ChangeID: 7,
					Op:       "create",
					Entry:    models.Entry{ID: "entry-1"},
					ChangedAt: func() time.Time {
						t, err := time.Parse(time.RFC3339, serverChangedAt)
						if err != nil {
							panic(err)
						}
						return t
					}(),
				},
			},
			Conflicts: []service.Conflict{
				{
					ChangeID:    "local-2",
					EntryID:     "entry-2",
					Reason:      "server_newer_than_base",
					ServerEntry: models.Entry{ID: "entry-2"},
					ClientEntry: models.Entry{ID: "entry-2"},
				},
			},
		},
	})

	recorder := performSyncV2Request(t, handler, `{"cursor":0,"deviceId":"device-1","clientChanges":[]}`)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	envelope := decodeEnvelope(t, recorder)
	if !envelope.Success {
		t.Fatal("expected success=true")
	}

	if got := string(envelope.Data["newCursor"]); got != "7" {
		t.Fatalf("expected newCursor=7, got %s", got)
	}

	var results []service.SyncResult
	mustRawValue(t, envelope.Data["results"], &results)
	if len(results) != 1 || results[0].ChangeID != "local-1" || results[0].Status != "applied" || results[0].EntryID != "entry-1" {
		t.Fatalf("unexpected results payload: %#v", results)
	}

	var serverChanges []service.ServerChange
	mustRawValue(t, envelope.Data["serverChanges"], &serverChanges)
	if len(serverChanges) != 1 || serverChanges[0].ChangeID != 7 || serverChanges[0].Op != "create" || serverChanges[0].Entry.ID != "entry-1" {
		t.Fatalf("unexpected serverChanges payload: %#v", serverChanges)
	}

	var conflicts []service.Conflict
	mustRawValue(t, envelope.Data["conflicts"], &conflicts)
	if len(conflicts) != 1 || conflicts[0].ChangeID != "local-2" || conflicts[0].EntryID != "entry-2" || conflicts[0].Reason != "server_newer_than_base" {
		t.Fatalf("unexpected conflicts payload: %#v", conflicts)
	}
}
