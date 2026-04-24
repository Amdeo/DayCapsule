package service

import (
	"encoding/json"
	"fmt"

	"github.com/daycapsule/backend/internal/models"
	"github.com/daycapsule/backend/internal/repository"
)

var ErrEntryNotFound = repository.ErrEntryNotFound

type EntryService struct {
	entryRepo     *repository.EntryRepository
	mediaRepo     *repository.MediaRepository
	deleteService *EntryDeleteService
	baseURL       string
}

func NewEntryService(entryRepo *repository.EntryRepository, mediaRepo *repository.MediaRepository, baseURL string) *EntryService {
	return &EntryService{
		entryRepo:     entryRepo,
		mediaRepo:     mediaRepo,
		deleteService: NewEntryDeleteService(entryRepo, mediaRepo),
		baseURL:       baseURL,
	}
}

func (s *EntryService) Create(userID string, req *models.CreateEntryRequest) (*models.EntryResponse, error) {
	entry, err := s.entryRepo.Create(userID, req)
	if err != nil {
		return nil, err
	}

	// Link media files to entry
	for _, mediaID := range req.MediaIDs {
		_ = s.mediaRepo.LinkToEntryForUser(userID, mediaID, entry.ID)
	}

	return s.toResponse(entry)
}

func (s *EntryService) GetPage(userID string, limit int, cursor *int64, entryType, search string, tags []string, startTime *int64) ([]*models.EntryResponse, error) {
	entries, err := s.entryRepo.GetPage(userID, limit, cursor, entryType, search, tags, startTime)
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
	if s.deleteService != nil {
		return s.deleteService.Delete(userID, entryID)
	}
	return s.entryRepo.Delete(userID, entryID)
}

func (s *EntryService) Count(userID string) (int, error) {
	return s.entryRepo.Count(userID)
}

func (s *EntryService) Export(userID string) ([]*models.EntryResponse, error) {
	entries, err := s.entryRepo.GetAll(userID)
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

func (s *EntryService) Import(userID string, entries []models.ImportEntry) (int, error) {
	// Clear existing entries first
	if err := s.entryRepo.DeleteAll(userID); err != nil {
		return 0, err
	}
	count := 0
	for _, e := range entries {
		req := &models.CreateEntryRequest{
			Type:              e.Type,
			Content:           e.Content,
			Tags:              e.Tags,
			RecordingStatus:   e.RecordingStatus,
			RecordingDuration: e.RecordingDuration,
		}
		if _, err := s.entryRepo.Create(userID, req); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
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
	media, err := s.buildMediaList(entry.UserID, entry.ID)
	if err != nil {
		media = []models.Media{}
	}
	media = s.resolveResponseMedia(entry, media)

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

func (s *EntryService) buildMediaList(userID, entryID string) ([]models.Media, error) {
	files, err := s.mediaRepo.GetByEntryIDForUser(userID, entryID)
	if err != nil {
		return nil, err
	}

	var media []models.Media
	for _, f := range files {
		var width *int
		if f.Width > 0 {
			value := f.Width
			width = &value
		}
		var height *int
		if f.Height > 0 {
			value := f.Height
			height = &value
		}
		media = append(media, models.Media{
			URI:              fmt.Sprintf("%s/api/media/%s", s.baseURL, f.ID),
			MimeType:         f.MimeType,
			Size:             f.Size,
			RemoteHash:       f.SHA256,
			ValidationStatus: f.ValidationStatus,
			ValidationError:  f.ValidationError,
			Width:            width,
			Height:           height,
		})
	}
	if media == nil {
		return []models.Media{}, nil
	}
	return media, nil
}

func (s *EntryService) resolveResponseMedia(entry *models.Entry, linkedMedia []models.Media) []models.Media {
	fallbackMedia := fallbackMediaList(entry.Media)
	if len(fallbackMedia) == 0 {
		if linkedMedia == nil {
			return []models.Media{}
		}
		return linkedMedia
	}

	recoveredFallback := s.recoverFallbackMedia(entry, fallbackMedia)
	return mergeResolvedMedia(linkedMedia, recoveredFallback)
}

func (s *EntryService) recoverFallbackMedia(entry *models.Entry, media []models.Media) []models.Media {
	if len(media) == 0 || s.mediaRepo == nil {
		return media
	}

	recovered := make([]models.Media, 0, len(media))
	for _, item := range media {
		if !isLocalFileURI(item.URI) {
			recovered = append(recovered, item)
			continue
		}

		filename := extractFilenameFromFileURI(item.URI)
		if filename == "" {
			recovered = append(recovered, item)
			continue
		}

		file, err := s.mediaRepo.FindByUserIDAndFilename(entry.UserID, filename)
		if err != nil || file == nil {
			recovered = append(recovered, item)
			continue
		}

		_ = s.mediaRepo.LinkToEntryForUser(entry.UserID, file.ID, entry.ID)
		item.URI = fmt.Sprintf("%s/api/media/%s", s.baseURL, file.ID)
		if item.MimeType == "" {
			item.MimeType = file.MimeType
		}
		if item.Size == 0 {
			item.Size = file.Size
		}
		recovered = append(recovered, item)
	}

	if recovered == nil {
		return []models.Media{}
	}
	return recovered
}

func mergeResolvedMedia(linkedMedia, fallbackMedia []models.Media) []models.Media {
	if len(fallbackMedia) == 0 {
		if linkedMedia == nil {
			return []models.Media{}
		}
		return linkedMedia
	}

	linkedByID := make(map[string]models.Media, len(linkedMedia))
	linkedByURI := make(map[string]models.Media, len(linkedMedia))
	for _, item := range linkedMedia {
		if mediaID := extractMediaIDFromURI(item.URI); mediaID != "" {
			linkedByID[mediaID] = item
		}
		if item.URI != "" {
			linkedByURI[item.URI] = item
		}
	}

	seenIDs := make(map[string]struct{}, len(linkedMedia)+len(fallbackMedia))
	seenURIs := make(map[string]struct{}, len(linkedMedia)+len(fallbackMedia))
	result := make([]models.Media, 0, len(linkedMedia)+len(fallbackMedia))
	appendUnique := func(item models.Media) {
		mediaID := extractMediaIDFromURI(item.URI)
		if mediaID != "" {
			if _, exists := seenIDs[mediaID]; exists {
				return
			}
			seenIDs[mediaID] = struct{}{}
		}

		if item.URI != "" {
			if _, exists := seenURIs[item.URI]; exists {
				return
			}
			seenURIs[item.URI] = struct{}{}
		}

		result = append(result, item)
	}

	for _, item := range fallbackMedia {
		if mediaID := extractMediaIDFromURI(item.URI); mediaID != "" {
			if linkedItem, ok := linkedByID[mediaID]; ok {
				appendUnique(linkedItem)
				continue
			}
		}
		if linkedItem, ok := linkedByURI[item.URI]; ok {
			appendUnique(linkedItem)
			continue
		}
		appendUnique(item)
	}

	for _, item := range linkedMedia {
		appendUnique(item)
	}

	if result == nil {
		return []models.Media{}
	}
	return result
}

type rawEntryMedia struct {
	URI              string  `json:"uri"`
	RemoteURI        string  `json:"remoteUri"`
	MimeType         string  `json:"mimeType"`
	Size             int64   `json:"size"`
	RemoteHash       string  `json:"remoteHash"`
	ValidationStatus string  `json:"validationStatus"`
	ValidationError  *string `json:"validationError"`
	Width            *int    `json:"width"`
	Height           *int    `json:"height"`
}

func fallbackMediaList(mediaJSON string) []models.Media {
	if mediaJSON == "" || mediaJSON == "[]" {
		return []models.Media{}
	}

	var rawMedia []rawEntryMedia
	if err := json.Unmarshal([]byte(mediaJSON), &rawMedia); err != nil {
		return []models.Media{}
	}

	media := make([]models.Media, 0, len(rawMedia))
	for _, item := range rawMedia {
		uri := item.RemoteURI
		if uri == "" {
			uri = item.URI
		}
		if uri == "" {
			continue
		}

		media = append(media, models.Media{
			URI:              uri,
			MimeType:         item.MimeType,
			Size:             item.Size,
			RemoteHash:       item.RemoteHash,
			ValidationStatus: item.ValidationStatus,
			ValidationError:  item.ValidationError,
			Width:            item.Width,
			Height:           item.Height,
		})
	}

	if media == nil {
		return []models.Media{}
	}
	return media
}
