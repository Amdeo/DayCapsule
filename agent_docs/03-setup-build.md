# Setup & Build Guide

## Environment Requirements

- Node.js 18+
- React Native 0.74
- iOS 15+ / Android 12+
- Xcode (for iOS development) and Android Studio

## Quick Start

⚠️ **Important**: All commands must be executed in the `app/` directory

```bash
# 1. Navigate to app directory
cd app

# 2. Install dependencies
npm install

# 3. Install iOS dependencies (macOS only, in app directory)
cd ios && bundle install && bundle exec pod install && cd ..

# 4. Start development server (Metro bundler)
npm start

# 5. Run app (new terminal window)
npm run ios          # iOS simulator
npm run android      # Android simulator
```

## Common Commands

All commands are executed in the `app/` directory:

```bash
# Development server
npm start            # Start Metro bundler
npm start -- --reset-cache  # Reset Metro cache

# Run app
npm run ios          # iOS simulator
npm run android      # Android simulator

# Code quality
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier format all code
npm run typecheck    # TypeScript type check (no compilation)

# Testing
npm test             # Unit tests
npm test -- <file>   # Run specific test file
npm run test:watch   # Watch mode testing
npm run test:coverage # Generate coverage report

# E2E testing
npm run test:e2e:build:ios    # Build iOS test version
npm run test:e2e:build:android # Build Android test version
npm run test:e2e:ios          # Run iOS E2E tests
npm run test:e2e:android      # Run Android E2E tests

# iOS dependency management
npm run pod         # Install CocoaPods dependencies (alternative to manual pod install)

# Cleanup
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json && npm install
# iOS-specific cleanup
cd ios && rm -rf Pods Podfile.lock && bundle exec pod install && cd ..
```
