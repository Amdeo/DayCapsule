package service

import (
	"encoding/json"
	"fmt"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

type EntryService struct {
	entryRepo *repository.EntryRepository
	mediaRepo *repository.MediaRepository
	baseURL   string
}

func NewEntryService(entryRepo *repository.EntryRepository, mediaRepo *repository.MediaRepository, baseURL string) *EntryService {
	return &EntryService{entryRepo: entryRepo, mediaRepo: mediaRepo, baseURL: baseURL}
}

func (s *EntryService) Create(userID string, req *models.CreateEntryRequest) (*models.EntryResponse, error) {
	entry, err := s.entryRepo.Create(userID, req)
	if err != nil {
		return nil, err
	}

	// Link media files to entry
	for _, mediaID := range req.MediaIDs {
		_ = s.mediaRepo.LinkToEntry(mediaID, entry.ID)
	}

	return s.toResponse(entry)
}

func (s *EntryService) GetPage(userID string, limit int, cursor *int64, entryType, search string, tags []string) ([]*models.EntryResponse, error) {
	entries, err := s.entryRepo.GetPage(userID, limit, cursor, entryType, search, tags)
	if err != nil {
		return nil, err
	}

	var responses []*models.EntryResponse
	for _, e := range entries {
		resp, err := s.toResponse(e)
		if err != nil {
			return nil, err
		}
		responses = append(responses, resp)
	}
	return responses, nil
}

func (s *EntryService) Update(userID, entryID string, req *models.UpdateEntryRequest) error {
	return s.entryRepo.Update(userID, entryID, req)
}

func (s *EntryService) Delete(userID, entryID string) error {
	return s.entryRepo.Delete(userID, entryID)
}

func (s *EntryService) GetAllTags(userID string) ([]string, error) {
	tags, err := s.entryRepo.GetAllTags(userID)
	if err != nil {
		return nil, err
	}
	if tags == nil {
		return []string{}, nil
	}
	return tags, nil
}

func (s *EntryService) toResponse(entry *models.Entry) (*models.EntryResponse, error) {
	var tags []string
	if err := json.Unmarshal([]byte(entry.Tags), &tags); err != nil {
		tags = []string{}
	}

	// Build media list from linked media files
	media, err := s.buildMediaList(entry.ID)
	if err != nil {
		media = []models.Media{}
	}

	return &models.EntryResponse{
		ID:                entry.ID,
		Type:              entry.Type,
		Content:           entry.Content,
		Tags:              tags,
		Media:             media,
		RecordingStatus:   entry.RecordingStatus,
		RecordingDuration: entry.RecordingDuration,
		SyncStatus:        entry.SyncStatus,
		Timestamp:         entry.CreatedAt.UnixMilli(),
	}, nil
}

func (s *EntryService) buildMediaList(entryID string) ([]models.Media, error) {
	files, err := s.mediaRepo.GetByEntryID(entryID)
	if err != nil {
		return nil, err
	}

	var media []models.Media
	for _, f := range files {
		media = append(media, models.Media{
			URI:      fmt.Sprintf("%s/api/media/%s", s.baseURL, f.ID),
			MimeType: f.MimeType,
			Size:     f.Size,
		})
	}
	if media == nil {
		return []models.Media{}, nil
	}
	return media, nil
}
