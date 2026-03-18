import fs from 'fs';
import path from 'path';

describe('runtime regression guards', () => {
  it('wraps the app layout with GestureHandlerRootView', () => {
    const layoutPath = path.join(process.cwd(), 'app', '_layout.tsx');
    const source = fs.readFileSync(layoutPath, 'utf8');

    expect(source).toContain("from 'react-native-gesture-handler'");
    expect(source).toContain('<GestureHandlerRootView');
  });

  it('imports SyncService from the local services directory with a named export', () => {
    const backupPagePath = path.join(process.cwd(), 'src', 'components', 'BackupPage.tsx');
    const source = fs.readFileSync(backupPagePath, 'utf8');

    expect(source).toContain("import { SyncService } from '../services/syncService';");
  });

  it('reads auto backup prerequisites in parallel when app goes to background', () => {
    const layoutPath = path.join(process.cwd(), 'app', '_layout.tsx');
    const source = fs.readFileSync(layoutPath, 'utf8');

    expect(source).toContain('const [autoBackup, shouldBackup] = await Promise.all([');
    expect(source).toContain("Storage.getString('settings:autoBackup')");
    expect(source).toContain('BackupService.shouldBackup()');
  });

  it('only updates recording duration when the value changes', () => {
    const homePath = path.join(process.cwd(), 'app', '(tabs)', 'index.tsx');
    const source = fs.readFileSync(homePath, 'utf8');

    expect(source).toContain('let lastDuration = 0;');
    expect(source).toContain('if (duration !== lastDuration) {');
    expect(source).toContain('lastDuration = duration;');
  });
});
