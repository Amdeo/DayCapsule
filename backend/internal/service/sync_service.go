package service

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

type SyncService struct {
	backupRepo *repository.BackupRepository
}

func NewSyncService(backupRepo *repository.BackupRepository) *SyncService {
	return &SyncService{backupRepo: backupRepo}
}

func (s *SyncService) GetStatus(userID string) (*models.BackupStatusResponse, error) {
	backup, err := s.backupRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	if backup == nil {
		return &models.BackupStatusResponse{
			HasBackup: false,
		}, nil
	}

	return &models.BackupStatusResponse{
		HasBackup:         true,
		Hash:              backup.DataHash,
		EntryCount:        backup.EntryCount,
		UpdatedAt:         backup.UpdatedAt,
		DeviceName:        backup.DeviceName,
		Encrypted:         backup.Encrypted,
		EncryptionVersion: backup.EncryptionVersion,
	}, nil
}

func (s *SyncService) Upload(userID string, req *models.UploadRequest) error {
	dataBytes, err := json.Marshal(req.Data)
	if err != nil {
		return err
	}

	backup := &models.Backup{
		UserID:            userID,
		DataJSON:          string(dataBytes),
		DataHash:          req.Hash,
		EntryCount:        req.EntryCount,
		DeviceName:        req.DeviceName,
		Encrypted:         req.Encrypted,
		EncryptionVersion: req.EncryptionVersion,
	}

	return s.backupRepo.Upsert(backup)
}

func (s *SyncService) Download(userID string) (*models.BackupData, string, time.Time, error) {
	backup, err := s.backupRepo.GetByUserID(userID)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	if backup == nil {
		return nil, "", time.Time{}, errors.New("backup not found")
	}

	var data models.BackupData
	if err := json.Unmarshal([]byte(backup.DataJSON), &data); err != nil {
		return nil, "", time.Time{}, err
	}

	return &data, backup.DataHash, backup.UpdatedAt, nil
}

func (s *SyncService) Delete(userID string) error {
	return s.backupRepo.Delete(userID)
}
