# AI Services Guide

## AI Service Configuration

### Speech-to-Text Service

- **Provider**: Tencent Cloud ASR (Speech Recognition)
- **Config file**: `src/config/tencentCloud.ts`
- **Configuration**: Requires Tencent Cloud SecretId and SecretKey
- **Supported languages**: Chinese, English and other languages, automatic language detection

### Image Recognition Service

- **Provider**: Baidu EasyDL TensorFlow Lite
- **Model files**: Need to download and place in specified directory
- **Features**: Automatic tagging suggestions, image content recognition

### Semantic Search

- **Implementation**: Local vector matching algorithm
- **Database**: SQLite FTS5 full-text search + semantic vector matching
- **Performance**: Search response < 2 seconds

## AI Feature Integration Locations

- **Speech-to-text**: `src/services/speechToText/`
- **Image recognition**: `src/services/ai/`
- **Semantic search**: `src/services/ai/semanticSearch.ts`
- **Configuration**: `src/config/tencentCloud.ts`

## Offline-First Principle

- All AI processing prioritizes local execution
- Cache data when network is unavailable, process after network recovery
- Sensitive data is not automatically uploaded to the cloud
