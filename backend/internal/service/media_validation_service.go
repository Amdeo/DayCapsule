package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/http"
	"os"
	"strings"
)

type ClientUploadMetadata struct {
	TraceID        string
	LocalMediaID   string
	PersistedHash  string
	SourceHash     string
	DeclaredSize   int64
	DeclaredWidth  int
	DeclaredHeight int
}

type MediaValidationResult struct {
	SHA256           string
	Size             int64
	Width            int
	Height           int
	ValidationStatus string
	ValidationError  *string
}

func ValidateUploadedPhoto(path string, metadata ClientUploadMetadata) (MediaValidationResult, error) {
	bytesOnDisk, err := os.ReadFile(path)
	if err != nil {
		return MediaValidationResult{}, err
	}

	sum := sha256.Sum256(bytesOnDisk)
	sha := hex.EncodeToString(sum[:])
	result := MediaValidationResult{
		SHA256:           sha,
		Size:             int64(len(bytesOnDisk)),
		ValidationStatus: "healthy",
	}

	var reasons []string
	if detected := http.DetectContentType(bytesOnDisk); !strings.HasPrefix(detected, "image/") {
		reasons = append(reasons, "mime_not_image")
	}

	cfg, _, decodeErr := image.DecodeConfig(bytes.NewReader(bytesOnDisk))
	if decodeErr != nil {
		reasons = append(reasons, "decode_config_failed")
	} else {
		result.Width = cfg.Width
		result.Height = cfg.Height
	}

	if metadata.PersistedHash != "" && metadata.PersistedHash != sha {
		reasons = append(reasons, "persisted_hash_mismatch")
	}
	if metadata.DeclaredSize > 0 && metadata.DeclaredSize != result.Size {
		reasons = append(reasons, "size_mismatch")
	}
	if metadata.DeclaredWidth > 0 && metadata.DeclaredWidth != result.Width {
		reasons = append(reasons, "width_mismatch")
	}
	if metadata.DeclaredHeight > 0 && metadata.DeclaredHeight != result.Height {
		reasons = append(reasons, "height_mismatch")
	}

	if len(reasons) > 0 {
		result.ValidationStatus = "upload_mismatch"
		reason := strings.Join(reasons, ",")
		result.ValidationError = &reason
	}

	return result, nil
}
