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
	createResp *models.MediaFile
	createErr  error
	lastInput  *models.MediaFileCreateInput
}

func (s *mediaHandlerStubStore) Create(userID, filename, mimeType, storagePath string, size int64) (*models.MediaFile, error) {
	if s.createErr != nil {
		return nil, s.createErr
	}
	return s.createResp, nil
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
