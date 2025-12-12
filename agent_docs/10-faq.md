# Frequently Asked Questions

## Q: How to add a new record type?

A:
1. Add new components and screens in `features/capture/`
2. Update data models and table structure in `src/services/storage/database.ts`
3. Add corresponding Redux slice in `src/store/slices/`
4. Update type definitions in `src/types/declarations.d.ts`

## Q: How to configure AI services?

A:
1. **Tencent Cloud ASR**: Edit `src/config/tencentCloud.ts`, fill in SecretId and SecretKey
2. **Baidu EasyDL**: Download TensorFlow Lite model files and place them in `src/assets/models/` directory
3. Test configuration: Run `npm run typecheck` to ensure configuration is correct

## Q: App won't start, how to troubleshoot?

A:
1. Check Metro cache: `npm start -- --reset-cache`
2. Check dependencies: `cd ios && bundle exec pod install && cd ..`
3. Check device simulator: Ensure iOS/Android simulator is running properly
4. Check logs: Metro bundler console output for error messages

## Q: How to optimize performance?

A:
1. Use `React.memo()` to wrap components, avoid unnecessary re-renders
2. Long lists use virtual scrolling (`FlatList` + `getItemLayout`)
3. Database queries use indexes, optimize SQLite performance
4. Images use caching and compression
5. Use `useMemo` and `useCallback` to cache computed results

## Q: Tests failing, how to handle?

A:
1. Run specific tests: `npm test -- --testNamePattern="test name"`
2. Update snapshots: `npm test -- -u`
3. Check Mock configuration: Mock settings in `jest.config.js`
4. Clear test cache: `npm test -- --clearCache`

## Q: iOS build failing, what to do?

A:
1. Update CocoaPods: `cd ios && bundle exec pod install --repo-update`
2. Clean build cache: `cd ios && xcodebuild clean`
3. Check certificate configuration: Ensure Apple Developer account is configured correctly in Xcode
4. View detailed errors: `cd ios && xcodebuild -list`
