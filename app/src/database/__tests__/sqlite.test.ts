const mockOpenDatabaseSync = jest.fn();

jest.mock('expo-sqlite', () => ({
  __esModule: true,
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

jest.mock('@/src/services/backendEnvironmentService', () => ({
  getCurrentServerUrlSync: jest.fn(() => 'https://server-a.example.com'),
  getServerKey: jest.fn((url: string) =>
    url === 'https://server-b.example.com'
      ? 'env_https_server_b_example_com'
      : 'env_https_server_a_example_com'
  ),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() },
}));

import { getCurrentServerUrlSync } from '@/src/services/backendEnvironmentService';
import { getDatabaseName, initDatabase, openDatabase, resetDatabase } from '../sqlite';

describe('sqlite environment isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentServerUrlSync as jest.Mock).mockReturnValue('https://server-a.example.com');
    mockOpenDatabaseSync.mockImplementation((name: string) => ({
      name,
      execAsync: jest.fn().mockResolvedValue(undefined),
    }));
    resetDatabase();
  });

  it('builds the database name from the current backend environment', () => {
    expect(getDatabaseName()).toBe('MemoryCapsule-env_https_server_a_example_com.db');
  });

  it('reopens the database when backend environment changes', () => {
    const dbA = openDatabase();

    (getCurrentServerUrlSync as jest.Mock).mockReturnValue('https://server-b.example.com');
    const dbB = openDatabase();

    expect(mockOpenDatabaseSync).toHaveBeenNthCalledWith(1, 'MemoryCapsule-env_https_server_a_example_com.db');
    expect(mockOpenDatabaseSync).toHaveBeenNthCalledWith(2, 'MemoryCapsule-env_https_server_b_example_com.db');
    expect(dbA).not.toBe(dbB);
  });

  it('creates entries table with media_json in the base schema', async () => {
    await initDatabase();

    const db = openDatabase() as { execAsync: jest.Mock };
    const createEntriesSql = db.execAsync.mock.calls[0][0] as string;

    expect(createEntriesSql).toContain('media_json TEXT');
  });
});
