package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/daycapsule/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type syncOverviewStubService struct {
	resp  *service.SyncOverview
	err   error
	calls int
}

func (s *syncOverviewStubService) GetByUser(_ string) (*service.SyncOverview, error) {
	s.calls++
	if s.err != nil {
		return nil, s.err
	}
	return s.resp, nil
}

func makeOverviewContext(t *testing.T, withUser bool) (*httptest.ResponseRecorder, *gin.Context) {
	t.Helper()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/sync/overview", nil)
	if withUser {
		ctx.Set("userID", "user-1")
	}
	return recorder, ctx
}

func TestSyncHandler_Overview_Returns200WithEnvelope(t *testing.T) {
	stub := &syncOverviewStubService{
		resp: &service.SyncOverview{
			EntryCount: 3,
			PhotoCount: 1,
			VoiceCount: 2,
			MediaCount: 4,
			MediaBytes: 1024,
		},
	}
	handler := NewSyncHandler(nil, stub)

	recorder, ctx := makeOverviewContext(t, true)
	handler.Overview(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	expected := `{"data":{"entryCount":3,"photoCount":1,"voiceCount":2,"mediaCount":4,"mediaBytes":1024},"success":true}`
	if got := recorder.Body.String(); got != expected {
		t.Fatalf("unexpected body:\nexpected: %s\ngot:      %s", expected, got)
	}
	if stub.calls != 1 {
		t.Fatalf("expected service calls=1, got %d", stub.calls)
	}
}

func TestSyncHandler_Overview_Returns500WhenServiceFails(t *testing.T) {
	stub := &syncOverviewStubService{err: errors.New("boom")}
	handler := NewSyncHandler(nil, stub)

	recorder, ctx := makeOverviewContext(t, true)
	handler.Overview(ctx)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}
	expected := `{"error":{"code":"INTERNAL_ERROR","message":"failed to get sync overview"},"success":false}`
	if got := recorder.Body.String(); got != expected {
		t.Fatalf("unexpected body:\nexpected: %s\ngot:      %s", expected, got)
	}
	if stub.calls != 1 {
		t.Fatalf("expected service calls=1, got %d", stub.calls)
	}
}

func TestSyncHandler_Overview_Returns401WhenUserIDMissing(t *testing.T) {
	stub := &syncOverviewStubService{}
	handler := NewSyncHandler(nil, stub)

	recorder, ctx := makeOverviewContext(t, false)
	handler.Overview(ctx)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
	expected := `{"error":{"code":"UNAUTHORIZED","message":"unauthorized"},"success":false}`
	if got := recorder.Body.String(); got != expected {
		t.Fatalf("unexpected body:\nexpected: %s\ngot:      %s", expected, got)
	}
	if stub.calls != 0 {
		t.Fatalf("expected service calls=0, got %d", stub.calls)
	}
}
