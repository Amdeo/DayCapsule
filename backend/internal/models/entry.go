package models

import "time"

type Entry struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	Type              string    `json:"type"`
	Content           string    `json:"content"`
	Tags              string    `json:"tags"`
	Media             string    `json:"media"`
	RecordingStatus   *string   `json:"recordingStatus,omitempty"`
	RecordingDuration *float64  `json:"recordingDuration,omitempty"`
	SyncStatus        string    `json:"syncStatus"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type EntryResponse struct {
	ID                string   `json:"id"`
	Type              string   `json:"type"`
	Content           string   `json:"content"`
	Tags              []string `json:"tags"`
	Media             []Media  `json:"media"`
	RecordingStatus   *string  `json:"recordingStatus,omitempty"`
	RecordingDuration *float64 `json:"recordingDuration,omitempty"`
	SyncStatus        string   `json:"syncStatus"`
	Timestamp         int64    `json:"timestamp"`
}

type Media struct {
	URI              string  `json:"uri"`
	MimeType         string  `json:"mimeType"`
	Size             int64   `json:"size"`
	RemoteHash       string  `json:"remoteHash,omitempty"`
	ValidationStatus string  `json:"validationStatus,omitempty"`
	ValidationError  *string `json:"validationError,omitempty"`
	Width            *int    `json:"width,omitempty"`
	Height           *int    `json:"height,omitempty"`
}

type CreateEntryRequest struct {
	Type              string   `json:"type" binding:"required,oneof=text photo voice"`
	Content           string   `json:"content"`
	Tags              []string `json:"tags"`
	MediaIDs          []string `json:"mediaIds"`
	RecordingStatus   *string  `json:"recordingStatus"`
	RecordingDuration *float64 `json:"recordingDuration"`
}

type UpdateEntryRequest struct {
	Content           *string  `json:"content"`
	Tags              []string `json:"tags"`
	RecordingStatus   *string  `json:"recordingStatus"`
	RecordingDuration *float64 `json:"recordingDuration"`
}

type ImportEntry struct {
	Type              string   `json:"type"`
	Content           string   `json:"content"`
	Tags              []string `json:"tags"`
	RecordingStatus   *string  `json:"recordingStatus,omitempty"`
	RecordingDuration *float64 `json:"recordingDuration,omitempty"`
}

type ImportRequest struct {
	Entries []ImportEntry `json:"entries" binding:"required"`
}

type MediaFile struct {
	ID                 string     `json:"id"`
	UserID             string     `json:"userId"`
	EntryID            *string    `json:"entryId,omitempty"`
	Filename           string     `json:"filename"`
	MimeType           string     `json:"mimeType"`
	Size               int64      `json:"size"`
	StoragePath        string     `json:"-"`
	SHA256             string     `json:"sha256,omitempty"`
	Width              int        `json:"width,omitempty"`
	Height             int        `json:"height,omitempty"`
	ValidationStatus   string     `json:"validationStatus,omitempty"`
	ValidationError    *string    `json:"validationError,omitempty"`
	ValidatedAt        *time.Time `json:"validatedAt,omitempty"`
	ClientLocalMediaID string     `json:"clientLocalMediaId,omitempty"`
	ClientPersistedHash string    `json:"clientPersistedHash,omitempty"`
	UploadTraceID      string     `json:"uploadTraceId,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type MediaFileCreateInput struct {
	SHA256              string
	Width               int
	Height              int
	ValidationStatus    string
	ValidationError     *string
	ValidatedAt         *time.Time
	ClientLocalMediaID  string
	ClientPersistedHash string
	UploadTraceID       string
}
