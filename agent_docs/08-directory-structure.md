# Directory Structure

## Main Source Code Directories

```
app/src/
├── features/           # Feature modules (organized by business domain)
│   ├── capture/        # Record creation (photo, recording, text)
│   ├── timeline/       # Timeline review and views
│   ├── search/         # Search and filtering
│   ├── settings/       # App settings
│   ├── voice/          # Voice recording and transcription
│   └── stats/          # Data statistics
├── services/           # Business service layer
│   ├── storage/        # SQLite database operations
│   ├── ai/             # AI features (image recognition, semantic search)
│   ├── speechToText/   # Speech-to-text service
│   ├── camera/         # Camera service
│   └── security/       # Encryption and security
├── store/              # Redux state management
│   ├── slices/         # Redux Toolkit slices
│   ├── hooks.ts        # Predefined useSelector/useDispatch hooks
│   └── index.ts        # Store configuration
├── ui/                 # Common UI components
├── app/                # App configuration
├── config/             # Configuration files
└── types/              # TypeScript type definitions
```

## Key File Locations

- **Database schema**: `src/services/storage/database.ts`
- **Redux Store configuration**: `src/store/index.ts`
- **App entry point**: `app/App.tsx`
- **Navigation configuration**: `src/app/navigation.tsx`
- **Theme configuration**: `src/app/theme.ts`
- **Type definitions**: `src/types/declarations.d.ts`

## Key Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and script configuration |
| `tsconfig.json` | TypeScript and path alias configuration |
| `jest.config.js` | Test configuration and Mock setup |
| `babel.config.js` | Babel transformation configuration |
| `metro.config.js` | Metro bundler configuration |
| `app.json` | React Native app configuration |
