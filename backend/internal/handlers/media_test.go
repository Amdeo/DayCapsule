package handlers

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"testing"
	"time"

	"github.com/daycapsule/backend/internal/middleware"
	"github.com/daycapsule/backend/internal/models"
	"github.com/gin-gonic/gin"
)

type mediaHandlerStubStore struct {
	createResp       *models.MediaFile
	createErr        error
	lastInput        *models.MediaFileCreateInput
	createCalls      int
	findByHashResp   *models.MediaFile
	findByHashErr    error
	findByHashCalls  int
	lastHashUserID   string
	lastHashValue    string
	findByTraceResp  *models.MediaFile
	findByTraceErr   error
	findByTraceCalls int
	lastTraceUserID  string
	lastTraceValue   string
}

func (s *mediaHandlerStubStore) CreateWithMetadata(
	userID,
	filename,
	mimeType,
	storagePath string,
	size int64,
	input models.MediaFileCreateInput,
) (*models.MediaFile, error) {
	s.lastInput = &input
	s.createCalls++
	if s.createErr != nil {
		return nil, s.createErr
	}
	if s.createResp == nil {
		s.createResp = &models.MediaFile{
			ID:               "media-1",
			UserID:           userID,
			Filename:         filename,
			MimeType:         mimeType,
			Size:             size,
			StoragePath:      storagePath,
			SHA256:           input.SHA256,
			Width:            input.Width,
			Height:           input.Height,
			ValidationStatus: input.ValidationStatus,
			ValidationError:  input.ValidationError,
			CreatedAt:        time.Now().UTC(),
		}
	}
	return s.createResp, nil
}

func (s *mediaHandlerStubStore) GetByID(_ string) (*models.MediaFile, error) {
	return nil, nil
}

func (s *mediaHandlerStubStore) Delete(_, _ string) error {
	return nil
}

func (s *mediaHandlerStubStore) FindByUserAndHash(userID, hash string) (*models.MediaFile, error) {
	s.findByHashCalls++
	s.lastHashUserID = userID
	s.lastHashValue = hash
	if s.findByHashErr != nil {
		return nil, s.findByHashErr
	}
	return s.findByHashResp, nil
}

func (s *mediaHandlerStubStore) FindByUserAndTraceID(userID, traceID string) (*models.MediaFile, error) {
	s.findByTraceCalls++
	s.lastTraceUserID = userID
	s.lastTraceValue = traceID
	if s.findByTraceErr != nil {
		return nil, s.findByTraceErr
	}
	return s.findByTraceResp, nil
}

func TestMediaHandlerUpload_AttachesAccessLogSummaryOnSuccess(t *testing.T) {
	store := &mediaHandlerStubStore{
		createResp: &models.MediaFile{
			ID:               "media-1",
			UserID:           "user-1",
			Filename:         "photo.jpg",
			MimeType:         "image/jpeg",
			Size:             5,
			SHA256:           "remote-hash-1",
			Width:            1,
			Height:           1,
			ValidationStatus: "healthy",
			CreatedAt:        time.Now().UTC(),
		},
	}
	handler := NewMediaHandler(store, t.TempDir())

	recorder, ctx := performMediaUploadRequestWithContext(t, handler, true)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", recorder.Code)
	}

	assertMediaAccessLogField(t, ctx, "upload.fieldName", "file")
	assertMediaAccessLogField(t, ctx, "upload.mimeType", "image/jpeg")
	assertMediaAccessLogField(t, ctx, "upload.size", int64(600))
	assertMediaAccessLogField(t, ctx, "upload.extension", ".jpg")
	assertMediaAccessLogField(t, ctx, "upload.mediaId", "media-1")
	assertMediaAccessLogField(t, ctx, "upload.validationStatus", "healthy")
	if store.lastInput == nil {
		t.Fatal("expected createWithMetadata input to be captured")
	}
	if store.lastInput.ClientPersistedHash != "persisted-hash-1" {
		t.Fatalf("expected persisted hash to be forwarded, got %#v", store.lastInput)
	}
	if recorder.Body.String() == "" {
		t.Fatal("expected response body")
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"remoteHash":"remote-hash-1"`)) {
		t.Fatalf("expected remoteHash in response, got %s", recorder.Body.String())
	}
}

func TestMediaHandlerUpload_SetsFailedStageWhenFileFieldMissing(t *testing.T) {
	handler := NewMediaHandler(&mediaHandlerStubStore{}, t.TempDir())

	recorder, ctx := performMediaUploadRequestWithContext(t, handler, false)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}

	assertMediaAccessLogField(t, ctx, "upload.failedStage", "form_file")
}

func TestMediaHandlerUpload_SetsFailedStageWhenRepositoryCreateFails(t *testing.T) {
	handler := NewMediaHandler(&mediaHandlerStubStore{
		createErr: errors.New("db down"),
	}, t.TempDir())

	recorder, ctx := performMediaUploadRequestWithContext(t, handler, true)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}

	assertMediaAccessLogField(t, ctx, "upload.failedStage", "save_record")
}

func TestMediaHandlerUpload_DedupsByTraceIDBeforeHash(t *testing.T) {
	store := &mediaHandlerStubStore{
		findByTraceResp: &models.MediaFile{
			ID:               "media-trace",
			UserID:           "user-1",
			Filename:         "photo.jpg",
			MimeType:         "image/jpeg",
			SHA256:           "trace-hash-1",
			ValidationStatus: "healthy",
			CreatedAt:        time.Now().UTC(),
		},
	}
	handler := NewMediaHandler(store, t.TempDir())

	recorder, ctx := performMediaUploadRequestWithContext(t, handler, true)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", recorder.Code)
	}
	if store.findByTraceCalls != 1 {
		t.Fatalf("expected trace lookup once, got %d", store.findByTraceCalls)
	}
	if store.lastTraceUserID != "user-1" || store.lastTraceValue != "trace-1" {
		t.Fatalf("unexpected trace lookup args: %q %q", store.lastTraceUserID, store.lastTraceValue)
	}
	if store.findByHashCalls != 0 {
		t.Fatalf("expected hash lookup to be skipped when trace match exists, got %d", store.findByHashCalls)
	}
	if store.createCalls != 0 {
		t.Fatalf("expected create to be skipped on dedup, got %d", store.createCalls)
	}
	assertMediaAccessLogField(t, ctx, "upload.dedup", "true")
	assertMediaAccessLogField(t, ctx, "upload.mediaId", "media-trace")
	assertMediaAccessLogField(t, ctx, "upload.validationStatus", "healthy")
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"remoteHash":"trace-hash-1"`)) {
		t.Fatalf("expected dedup response to include existing remoteHash, got %s", recorder.Body.String())
	}
}

func TestMediaHandlerUpload_DedupsByHashWhenTraceMisses(t *testing.T) {
	store := &mediaHandlerStubStore{
		findByHashResp: &models.MediaFile{
			ID:               "media-hash",
			UserID:           "user-1",
			Filename:         "photo.jpg",
			MimeType:         "image/jpeg",
			SHA256:           "hash-hit-1",
			ValidationStatus: "healthy",
			CreatedAt:        time.Now().UTC(),
		},
	}
	handler := NewMediaHandler(store, t.TempDir())

	recorder, ctx := performMediaUploadRequestWithContext(t, handler, true)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", recorder.Code)
	}
	if store.findByTraceCalls != 1 {
		t.Fatalf("expected trace lookup once, got %d", store.findByTraceCalls)
	}
	if store.findByHashCalls != 1 {
		t.Fatalf("expected hash lookup once after trace miss, got %d", store.findByHashCalls)
	}
	if store.lastHashUserID != "user-1" {
		t.Fatalf("unexpected hash lookup user: %q", store.lastHashUserID)
	}
	if store.lastHashValue == "" {
		t.Fatal("expected non-empty hash lookup value")
	}
	if store.createCalls != 0 {
		t.Fatalf("expected create to be skipped on hash dedup, got %d", store.createCalls)
	}
	assertMediaAccessLogField(t, ctx, "upload.dedup", "true")
	assertMediaAccessLogField(t, ctx, "upload.mediaId", "media-hash")
	assertMediaAccessLogField(t, ctx, "upload.validationStatus", "healthy")
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"remoteHash":"hash-hit-1"`)) {
		t.Fatalf("expected dedup response to include hash match, got %s", recorder.Body.String())
	}
}

func performMediaUploadRequestWithContext(t *testing.T, handler *MediaHandler, includeFile bool) (*httptest.ResponseRecorder, *gin.Context) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if includeFile {
		partHeaders := textproto.MIMEHeader{}
		partHeaders.Set("Content-Disposition", `form-data; name="file"; filename="photo.jpg"`)
		partHeaders.Set("Content-Type", "image/jpeg")

		part, err := writer.CreatePart(partHeaders)
		if err != nil {
			t.Fatalf("create multipart part: %v", err)
		}
		if _, err := part.Write(buildValidJPEGBytes(t)); err != nil {
			t.Fatalf("write multipart body: %v", err)
		}
		if err := writer.WriteField("traceId", "trace-1"); err != nil {
			t.Fatalf("write traceId: %v", err)
		}
		if err := writer.WriteField("localMediaId", "local-1"); err != nil {
			t.Fatalf("write localMediaId: %v", err)
		}
		if err := writer.WriteField("persistedHash", "persisted-hash-1"); err != nil {
			t.Fatalf("write persistedHash: %v", err)
		}
		if err := writer.WriteField("size", "600"); err != nil {
			t.Fatalf("write size: %v", err)
		}
		if err := writer.WriteField("width", "1"); err != nil {
			t.Fatalf("write width: %v", err)
		}
		if err := writer.WriteField("height", "1"); err != nil {
			t.Fatalf("write height: %v", err)
		}
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/media/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	ctx.Request = req
	ctx.Set("userID", "user-1")

	handler.Upload(ctx)
	return recorder, ctx
}

func buildValidJPEGBytes(t *testing.T) []byte {
	t.Helper()

	img := image.NewRGBA(image.Rect(0, 0, 1, 1))
	img.Set(0, 0, color.RGBA{R: 255, G: 128, B: 64, A: 255})

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}
	return buf.Bytes()
}

func assertMediaAccessLogField(t *testing.T, ctx *gin.Context, key string, want any) {
	t.Helper()

	got, ok := middleware.GetAccessLogField(ctx, key)
	if !ok {
		t.Fatalf("expected access log field %q to be set", key)
	}
	if got != want {
		t.Fatalf("expected access log field %q to be %#v, got %#v", key, want, got)
	}
}
