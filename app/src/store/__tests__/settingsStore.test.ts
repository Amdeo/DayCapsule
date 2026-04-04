/**
 * settingsStore 单元测试 — photoHeight 设置项
 */

jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete:    jest.fn(),
  },
  withScope: jest.fn((scope: string, key: string) => `${scope}:${key}`),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/services/workspaceService', () => ({
  getCurrentDataScopeKey: jest.fn().mockResolvedValue('env_https_server_a_example_com'),
}));

import { useSettingsStore } from '../settingsStore';
import { getCurrentDataScopeKey } from '@/src/services/workspaceService';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const { Storage } = require('@/src/utils/storage');
const SERVER_A_SCOPE = 'env_https_server_a_example_com';
const SERVER_B_SCOPE = 'env_https_server_b_example_com';
const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

const resetStore = () =>
  useSettingsStore.setState({
    notifications: true,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    calendarDensity: 'default',
    lastAddType: null,
    isLoaded: false,
  });

beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentDataScopeKey as jest.Mock).mockResolvedValue('env_https_server_a_example_com');
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
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:photoHeight') ? 'compact' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('compact');
  });

  it('loads "large" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:photoHeight') ? 'large' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('large');
  });

  it('falls back to "default" for invalid stored value', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:photoHeight') ? 'invalid_value' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().photoHeight).toBe('default');
  });

  it('loads values from the current backend environment only', async () => {
    (getCurrentDataScopeKey as jest.Mock).mockResolvedValue('env_https_server_b_example_com');
    Storage.getString.mockImplementation((key: string) => {
      if (key === scopedKey(SERVER_A_SCOPE, 'settings:photoHeight')) return Promise.resolve('compact');
      if (key === scopedKey(SERVER_B_SCOPE, 'settings:photoHeight')) return Promise.resolve('large');
      return Promise.resolve(null);
    });

    await useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState().photoHeight).toBe('large');
  });

  it('shows branded feedback when loading settings fails', async () => {
    Storage.getString.mockRejectedValueOnce(new Error('mmkv locked'));

    await useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState().isLoaded).toBe(true);
    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '加载失败',
      message: '设置加载失败，已使用默认设置。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });
});

describe('setPhotoHeight', () => {
  it('saves value to storage and updates state', async () => {
    Storage.setString.mockResolvedValue(undefined);
    await useSettingsStore.getState().setPhotoHeight('compact');
    expect(Storage.setString).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'settings:photoHeight'),
      'compact'
    );
    expect(useSettingsStore.getState().photoHeight).toBe('compact');
  });
});

describe('resetSettings — photoHeight', () => {
  it('deletes photoHeight key and resets to default', async () => {
    Storage.delete.mockResolvedValue(undefined);
    useSettingsStore.setState({ photoHeight: 'large' });

    await useSettingsStore.getState().resetSettings();

    expect(Storage.delete).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'settings:photoHeight'));
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
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:lastAddType') ? 'text' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('text');
  });

  it('loads "camera" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:lastAddType') ? 'camera' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('camera');
  });

  it('loads "photo" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:lastAddType') ? 'photo' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('photo');
  });

  it('loads "voice" from storage', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:lastAddType') ? 'voice' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBe('voice');
  });

  it('falls back to null for invalid stored value', async () => {
    Storage.getString.mockImplementation((key: string) =>
      Promise.resolve(key === scopedKey(SERVER_A_SCOPE, 'settings:lastAddType') ? 'invalid' : null)
    );
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().lastAddType).toBeNull();
  });
});

describe('setLastAddType', () => {
  it('saves value to storage and updates state', async () => {
    Storage.setString.mockResolvedValue(undefined);
    await useSettingsStore.getState().setLastAddType('camera');
    expect(Storage.setString).toHaveBeenCalledWith(
      scopedKey(SERVER_A_SCOPE, 'settings:lastAddType'),
      'camera'
    );
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

    expect(Storage.delete).toHaveBeenCalledWith(scopedKey(SERVER_A_SCOPE, 'settings:lastAddType'));
    expect(useSettingsStore.getState().lastAddType).toBeNull();
  });
});
