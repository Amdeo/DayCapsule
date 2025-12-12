# Module Index

## Module Structure Diagram

```mermaid
graph TD
    A["(Root) MemoryCapsule"] --> B["app"];
    B --> C["src"];
    C --> D["features"];
    D --> E["capture"];
    D --> F["timeline"];
    D --> G["search"];
    D --> H["settings"];
    D --> I["voice"];
    D --> J["stats"];
    C --> K["services"];
    K --> L["storage"];
    K --> M["ai"];
    K --> N["camera"];
    K --> O["security"];
    K --> P["location"];
    C --> Q["store"];
    C --> R["app"];
    C --> S["ui"];
    C --> T["hooks"];
    C --> U["utils"];
    C --> V["config"];

    click E "./app/src/features/capture/CLAUDE.md" "View capture module docs"
    click F "./app/src/features/timeline/CLAUDE.md" "View timeline module docs"
    click G "./app/src/features/search/CLAUDE.md" "View search module docs"
    click H "./app/src/features/settings/CLAUDE.md" "View settings module docs"
    click I "./app/src/features/voice/CLAUDE.md" "View voice module docs"
    click J "./app/src/features/stats/CLAUDE.md" "View stats module docs"
```

## Module Index

| Module | Path | Responsibility | Entry File | Test Coverage |
|--------|------|----------------|------------|---------------|
| capture | `app/src/features/capture/` | Record creation (photo, text, voice) | `HomeScreen.tsx` | 80% |
| timeline | `app/src/features/timeline/` | Timeline review and view switching | `TimelineScreen.tsx` | 75% |
| search | `app/src/features/search/` | Search and filtering | `SearchScreen.tsx` | 70% |
| settings | `app/src/features/settings/` | App settings and security management | `SettingsScreen.tsx` | 85% |
| voice | `app/src/features/voice/` | Voice recording and transcription | `VoiceRecordScreen.tsx` | 75% |
| stats | `app/src/features/stats/` | Data statistics and visualization | `StatsScreen.tsx` | 65% |
