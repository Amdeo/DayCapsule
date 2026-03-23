import fs from 'fs';
import path from 'path';

describe('app config branding', () => {
  it('keeps DayCapsule as the visible brand without changing app identity', () => {
    const appConfigPath = path.join(process.cwd(), 'app.json');
    const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8')) as {
      expo: {
        name: string;
        ios: {
          bundleIdentifier: string;
          infoPlist: Record<string, string>;
        };
        android: {
          package: string;
        };
      };
    };

    expect(appConfig.expo.name).toBe('DayCapsule');
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.memorycapsule.app');
    expect(appConfig.expo.android.package).toBe('com.memorycapsule.app');
    expect(appConfig.expo.ios.infoPlist.NSCameraUsageDescription).toContain('DayCapsule');
    expect(appConfig.expo.ios.infoPlist.NSMicrophoneUsageDescription).toContain('DayCapsule');
    expect(appConfig.expo.ios.infoPlist.NSPhotoLibraryUsageDescription).toContain('DayCapsule');
  });
});
