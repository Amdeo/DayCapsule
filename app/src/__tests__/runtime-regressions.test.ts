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
});
