package service

import (
	"encoding/json"
	"net/url"
	"path"
	"strings"
)

func mediaIDsFromJSON(mediaJSON string) []string {
	if mediaJSON == "" || mediaJSON == "[]" {
		return nil
	}

	var rawMedia []rawEntryMedia
	if err := json.Unmarshal([]byte(mediaJSON), &rawMedia); err != nil {
		return nil
	}

	seen := make(map[string]struct{}, len(rawMedia))
	ids := make([]string, 0, len(rawMedia))
	for _, item := range rawMedia {
		for _, candidate := range []string{item.RemoteURI, item.URI} {
			mediaID := extractMediaIDFromURI(candidate)
			if mediaID == "" {
				continue
			}
			if _, exists := seen[mediaID]; exists {
				continue
			}
			seen[mediaID] = struct{}{}
			ids = append(ids, mediaID)
		}
	}
	return ids
}

func isLocalFileURI(rawURI string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(rawURI)), "file://")
}

func extractFilenameFromFileURI(rawURI string) string {
	trimmed := strings.TrimSpace(rawURI)
	if trimmed == "" || !isLocalFileURI(trimmed) {
		return ""
	}

	name := ""
	if parsed, err := url.Parse(trimmed); err == nil {
		name = path.Base(parsed.Path)
	}
	if name == "" || name == "." || name == "/" {
		cleaned := strings.TrimRight(trimmed, "/")
		if idx := strings.LastIndex(cleaned, "/"); idx >= 0 && idx+1 < len(cleaned) {
			name = cleaned[idx+1:]
		}
	}
	if decoded, err := url.PathUnescape(name); err == nil {
		name = decoded
	}
	if name == "" || name == "." || name == "/" {
		return ""
	}
	return name
}

func extractMediaIDFromURI(rawURI string) string {
	trimmed := strings.TrimSpace(rawURI)
	if trimmed == "" || isLocalFileURI(trimmed) {
		return ""
	}

	pathValue := trimmed
	if parsed, err := url.Parse(trimmed); err == nil && parsed.Path != "" {
		pathValue = parsed.Path
	}

	parts := strings.Split(strings.Trim(pathValue, "/"), "/")
	for i := 0; i+2 < len(parts); i++ {
		if parts[i] == "api" && parts[i+1] == "media" && parts[i+2] != "" {
			return parts[i+2]
		}
	}
	return ""
}
