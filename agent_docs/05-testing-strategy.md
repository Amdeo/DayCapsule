# Testing Strategy

## Unit Tests

- **Coverage requirements**: Branches, functions, lines, statements ≥ 70%
- **Testing framework**: Jest + React Native Testing Library
- **Focus areas**: User interaction logic, business logic, state management

## E2E Tests

- **Testing framework**: Detox
- **Coverage scenarios**: Core user flows (photo capture, voice recording, search, timeline browsing)
- **Performance validation**: Response time < 2 seconds

## Mock Strategy

The project configures comprehensive mocks for third-party libraries:
- React Native related libraries (camera, file system, permissions, etc.)
- UI libraries (React Native Paper, icon libraries, etc.)
- State management (Redux Toolkit)

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- <file>

# Watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# E2E tests
npm run test:e2e:build:ios
npm run test:e2e:build:android
npm run test:e2e:ios
npm run test:e2e:android
```

## Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing the scenario
- Use existing test utilities/helpers
- Tests should be deterministic
