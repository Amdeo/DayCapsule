# MCP Tools Guide

## Core Tools

| Server | Tool | Purpose |
|--------|------|---------|
| sequential-thinking | `sequentialthinking` | Deep thinking and analysis |
| zai-mcp-server | `analyze_image`, `diagnose_error_screenshot` | Image/error analysis |
| context7 | `resolve-library-id`, `get-library-docs` | Get library docs |
| serena | `find_symbol`, `search_for_pattern` | Code search |
| open-websearch | `web_search`, `fetchGithubReadme` | Web research |
| mobile-mcp | `mobile_take_screenshot`, `mobile_click_on_screen_at_coordinates` | Mobile device control |

## Usage Principles

1. **Think First**: Use `sequentialthinking` for complex tasks
2. **Image Analysis**: Use `zai-mcp-server` for uploaded images
3. **Code Search**: Prefer `serena` symbol-level search
4. **Web Search**: Use `open-websearch` or `web-search-prime`

## Common Scenarios

### Code Search
```bash
# Find components in a feature
mcp__serena__find_symbol({
  "name_path_pattern": "components",
  "relative_path": "app/src/features/capture"
})

# Search patterns
mcp__serena__search_for_pattern({
  "substring_pattern": "useAppSelector",
  "relative_path": "app/src"
})
```

### Get Library Docs
```bash
# Get React documentation
mcp__context7__resolve_library_id({"libraryName": "react"})
mcp__context7__get_library_docs({
  "context7CompatibleLibraryID": "/facebook/react",
  "mode": "code",
  "topic": "hooks"
})
```

### Mobile Testing
```bash
# List devices
mcp__mobile-mcp__mobile_list_available_devices({})

# Take screenshot
mcp__mobile-mcp__mobile_take_screenshot({
  "device": "ios-simulator"
})

# Tap at coordinates
mcp__mobile-mcp__mobile_click_on_screen_at_coordinates({
  "device": "ios-simulator",
  "x": 100,
  "y": 200
})
```

### Deep Analysis
```bash
# Complex problem solving
mcp__sequential-thinking__sequentialthinking({
  "thought": "Analyze this architecture decision...",
  "totalThoughts": 5,
  "nextThoughtNeeded": true
})
```

### Web Research
```bash
# Search latest practices
mcp__open-websearch__search({
  "query": "React Native performance optimization 2025",
  "engines": ["duckduckgo"]
})
```

### Image Analysis
```bash
# Analyze screenshots
mcp__zai-mcp-server__analyze_image({
  "image_source": "screenshot.png",
  "prompt": "What UI issues do you see?"
})
```

## Quick Reference

**Code Understanding**: `serena` → `get_symbols_overview` → `find_symbol`
**Documentation**: `context7` → `resolve_library_id` → `get_library_docs`
**Mobile Testing**: `mobile-mcp` → `list_available_devices` → `take_screenshot`
**Research**: `open-websearch` → `web_search`
**Analysis**: `sequential-thinking` → `sequentialthinking`
