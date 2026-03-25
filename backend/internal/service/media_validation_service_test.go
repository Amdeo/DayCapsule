package service

import (
	"crypto/sha256"
	"encoding/hex"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"
)

func createValidationTestJPEG(t *testing.T, width, height int) (string, string, int64) {
	t.Helper()

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: uint8((x + y) % 255), G: 120, B: 180, A: 255})
		}
	}

	path := filepath.Join(t.TempDir(), "validation-photo.jpg")
	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("create jpeg file: %v", err)
	}
	defer file.Close()

	if err := jpeg.Encode(file, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}

	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read jpeg bytes: %v", err)
	}
	sum := sha256.Sum256(bytes)
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat jpeg file: %v", err)
	}

	return path, hex.EncodeToString(sum[:]), info.Size()
}

func TestValidateUploadedPhoto_ReturnsSHAAndDimensions(t *testing.T) {
	testJPEGPath, expectedHash, expectedSize := createValidationTestJPEG(t, 1080, 2400)

	result, err := ValidateUploadedPhoto(testJPEGPath, ClientUploadMetadata{
		PersistedHash:  expectedHash,
		DeclaredSize:   expectedSize,
		DeclaredWidth:  1080,
		DeclaredHeight: 2400,
	})
	if err != nil {
		t.Fatalf("validate uploaded photo: %v", err)
	}
	if result.SHA256 != expectedHash {
		t.Fatalf("expected persisted hash match, got %q", result.SHA256)
	}
	if result.Size != expectedSize {
		t.Fatalf("expected size %d, got %d", expectedSize, result.Size)
	}
	if result.Width != 1080 || result.Height != 2400 {
		t.Fatalf("expected dimensions 1080x2400, got %dx%d", result.Width, result.Height)
	}
	if result.ValidationStatus != "healthy" {
		t.Fatalf("expected validation_status healthy, got %q", result.ValidationStatus)
	}
	if result.ValidationError != nil {
		t.Fatalf("expected validation_error nil, got %#v", result.ValidationError)
	}
}

func TestValidateUploadedPhoto_FlagsHashMismatch(t *testing.T) {
	testJPEGPath, _, expectedSize := createValidationTestJPEG(t, 320, 240)

	result, err := ValidateUploadedPhoto(testJPEGPath, ClientUploadMetadata{
		PersistedHash:  "sha256-wrong",
		DeclaredSize:   expectedSize,
		DeclaredWidth:  320,
		DeclaredHeight: 240,
	})
	if err != nil {
		t.Fatalf("validate uploaded photo: %v", err)
	}
	if result.ValidationStatus != "upload_mismatch" {
		t.Fatalf("expected upload_mismatch, got %q", result.ValidationStatus)
	}
	if result.ValidationError == nil || *result.ValidationError == "" {
		t.Fatalf("expected validation error message, got %#v", result.ValidationError)
	}
}
