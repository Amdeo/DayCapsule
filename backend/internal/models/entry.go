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
	URI      string `json:"uri"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
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

type MediaFile struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	EntryID     *string   `json:"entryId,omitempty"`
	Filename    string    `json:"filename"`
	MimeType    string    `json:"mimeType"`
	Size        int64     `json:"size"`
	StoragePath string    `json:"-"`
	CreatedAt   time.Time `json:"createdAt"`
}
