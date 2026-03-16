package models

import "time"

type Backup struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	DataJSON          string    `json:"-"`
	DataHash          string    `json:"dataHash"`
	EntryCount        int       `json:"entryCount"`
	DeviceName        string    `json:"deviceName"`
	Encrypted         bool      `json:"encrypted"`
	EncryptionVersion int       `json:"encryptionVersion"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type BackupData struct {
	Entries []map[string]interface{} `json:"entries"`
	Tags    []map[string]interface{} `json:"tags"`
	Version int                      `json:"version"`
}

type UploadRequest struct {
	Data              BackupData `json:"data" binding:"required"`
	Hash              string     `json:"hash" binding:"required"`
	EntryCount        int        `json:"entryCount"`
	DeviceName        string     `json:"deviceName"`
	Encrypted         bool       `json:"encrypted"`
	EncryptionVersion int        `json:"encryptionVersion"`
}

type BackupStatusResponse struct {
	HasBackup         bool      `json:"hasBackup"`
	Hash              string    `json:"hash"`
	EntryCount        int       `json:"entryCount"`
	UpdatedAt         time.Time `json:"updatedAt"`
	DeviceName        string    `json:"deviceName"`
	Encrypted         bool      `json:"encrypted"`
	EncryptionVersion int       `json:"encryptionVersion"`
}
