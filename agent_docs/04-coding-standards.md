# Coding Standards

## TypeScript Configuration

- **Strict mode**: Disabled (`strict: false`)
- **Type checking**: Use `npm run typecheck` for type validation
- **Path aliases**: Project configured with complete path alias system (see below)

## Path Alias System

The project extensively uses path aliases. Always prefer aliases over relative paths:

```typescript
// ✅ Recommended - Use path aliases
import { useAppSelector } from '@store/hooks'
import { EntryCard } from '@ui/components/EntryCard'

// ❌ Not recommended - Relative paths
import { useAppSelector } from '../../store/hooks'
```

## Path Alias Configuration

Path aliases configured in `tsconfig.json`. **Strongly recommended** to use aliases when importing:

```typescript
@/              → app/src/
@features/      → app/src/features/
@services/      → app/src/services/
@store/         → app/src/store/
@store/*        → app/src/store/*
@ui/            → app/src/ui/
@ui/*           → app/src/ui/*
@hooks/*        → app/src/hooks/*
@utils/*        → app/src/utils/*
@app/*          → app/src/app/*
@config/*       → app/src/config/*
```

**Notes**:
- Path aliases are resolved from the `app/` directory
- Using aliases avoids complex relative paths
- Helps with code refactoring and module relocation

## Architecture Patterns

- **Feature-first**: Organize code by business domain
- **Layered architecture**: Features → Services → Store → UI
- **Separation of concerns**: Business logic separated from UI components
- **Redux Toolkit**: Used for global state management

## Component Development Patterns

- Each feature module contains `components/`, `screens/`, `hooks/` subdirectories
- Components use TypeScript + React.memo() for performance optimization
- Custom Hooks reuse business logic
- All components have corresponding test files

## Performance Optimization Requirements

- **Key metrics**: All core operations response time < 2 seconds
- **List optimization**: Timeline uses virtual scrolling (FlatList with `getItemLayout` and `removeClippedSubviews`)
- **Rendering optimization**: Components use `React.memo()` to avoid unnecessary re-renders
- **Memory management**: Regularly clean up cache, monitor memory usage < 150MB
