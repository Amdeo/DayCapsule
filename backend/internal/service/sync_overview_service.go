package service

import (
	"errors"

	"github.com/daycapsule/backend/internal/repository"
)

type SyncOverview struct {
	EntryCount int   `json:"entryCount"`
	PhotoCount int   `json:"photoCount"`
	VoiceCount int   `json:"voiceCount"`
	MediaCount int   `json:"mediaCount"`
	MediaBytes int64 `json:"mediaBytes"`
}

type SyncOverviewService struct {
	entryRepo *repository.EntryRepository
	mediaRepo *repository.MediaRepository
}

func NewSyncOverviewService(entryRepo *repository.EntryRepository, mediaRepo *repository.MediaRepository) *SyncOverviewService {
	return &SyncOverviewService{entryRepo: entryRepo, mediaRepo: mediaRepo}
}

func (s *SyncOverviewService) GetByUser(userID string) (*SyncOverview, error) {
	if s == nil || s.entryRepo == nil || s.mediaRepo == nil {
		return nil, errors.New("sync overview service not initialized")
	}

	entryCount, err := s.entryRepo.Count(userID)
	if err != nil {
		return nil, err
	}
	photoCount, err := s.entryRepo.CountByType(userID, "photo")
	if err != nil {
		return nil, err
	}
	voiceCount, err := s.entryRepo.CountByType(userID, "voice")
	if err != nil {
		return nil, err
	}
	mediaCount, mediaBytes, err := s.mediaRepo.CountAndBytes(userID)
	if err != nil {
		return nil, err
	}

	return &SyncOverview{
		EntryCount: entryCount,
		PhotoCount: photoCount,
		VoiceCount: voiceCount,
		MediaCount: mediaCount,
		MediaBytes: mediaBytes,
	}, nil
}
