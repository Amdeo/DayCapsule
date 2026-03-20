/**
 * settingsStore 单元测试 — photoHeight 设置项
 */

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete:    jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { useSettingsStore } from '../settingsStore';

const { Storage } = require('@/src/utils/storage');

const resetStore = () =>
  useSettingsStore.setState({
    notifications: true,
    autoBackup: false,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    lastAddType: null,
    cloudMode: false,
    isLoaded: false,
  });

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('loadSettings — photoHeight', () => {
  it('defaults to "default" when key is missing', async () => {
    Storage.getString.mockResolvedValue(null);
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('default');
  });

  it('loads "compact" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:photoHeight' ? 'compact' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('compact');
  });

  it('loads "large" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:photoHeight' ? 'large' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('large');
  });

  it('falls back to "default" for invalid stored value', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:photoHeight' ? 'invalid_value' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('default');
  });
});

describe('setPhotoHeight', () => {
  it('saves value to storage and updates state', async () => {
    Storage.setString.mockResolvedValue(undefined);
    await useSettingsStore.getState().setPhotoHeight('compact');
    expect(Storage.setString).toHaveBeenCalledWith('settings:photoHeight', 'compact');
    expect(useSettingsStore.getState().photoHeight).toBe('compact');
  });
});

describe('resetSettings — photoHeight', () => {
  it('deletes photoHeight key and resets to default', async () => {
    Storage.delete.mockResolvedValue(undefined);
    useSettingsStore.setState({ photoHeight: 'large' });

    await useSettingsStore.getState().resetSettings();

    expect(Storage.delete).toHaveBeenCalledWith('settings:photoHeight');
    expect(useSettingsStore.getState().photoHeight).toBe('default');
  });
});

describe('loadSettings — lastAddType', () => {
  it('defaults to null when key is missing', async () => {
    Storage.getString.mockResolvedValue(null);
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBeNull();
  });

  it('loads "text" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:lastAddType' ? 'text' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('text');
  });

  it('loads "camera" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:lastAddType' ? 'camera' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('camera');
  });

  it('loads "photo" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:lastAddType' ? 'photo' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('photo');
  });

  it('loads "voice" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:lastAddType' ? 'voice' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('voice');
  });

  it('falls back to null for invalid stored value', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === 'settings:lastAddType' ? 'invalid' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBeNull();
  });
});

describe('setLastAddType', () => {
  it('saves value to storage and updates state', async () => {
    Storage.setString.mockResolvedValue(undefined);
    await useSettingsStore.getState().setLastAddType('camera');
    expect(Storage.setString).toHaveBeenCalledWith('settings:lastAddType', 'camera');
    expect(useSettingsStore.getState().lastAddType).toBe('camera');
  });

  it('can set all valid types', async () => {
    Storage.setString.mockResolvedValue(undefined);
    for (const t of ['text', 'camera', 'photo', 'voice'] as const) {
      await useSettingsStore.getState().setLastAddType(t);
      expect(useSettingsStore.getState().lastAddType).toBe(t);
    }
  });
});

describe('resetSettings — lastAddType', () => {
  it('deletes lastAddType key and resets to null', async () => {
    Storage.delete.mockResolvedValue(undefined);
    useSettingsStore.setState({ lastAddType: 'camera' });

    await useSettingsStore.getState().resetSettings();

    expect(Storage.delete).toHaveBeenCalledWith('settings:lastAddType');
    expect(useSettingsStore.getState().lastAddType).toBeNull();
  });
});

describe('cloudMode', () => {
  it('defaults to false', () => {
    expect(useSettingsStore.getState().cloudMode).toBe(false);
  });

  it('setCloudMode persists to MMKV', async () => {
    await useSettingsStore.getState().setCloudMode('switching');
    expect(Storage.setString).toHaveBeenCalledWith('settings:cloudMode', 'switching');
    expect(useSettingsStore.getState().cloudMode).toBe('switching');

    await useSettingsStore.getState().setCloudMode(true);
    expect(Storage.setString).toHaveBeenCalledWith('settings:cloudMode', 'true');
    expect(useSettingsStore.getState().cloudMode).toBe(true);
  });
});
