import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SettingsPage } from '../SettingsPage';

const mockSetCalendarDensity = jest.fn();
const mockLoadSettings = jest.fn();
const mockResetSettings = jest.fn();

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: [],
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({
    notifications: false,
    autoBackup: false,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    calendarDensity: 'default',
    isLoaded: true,
    loadSettings: mockLoadSettings,
    setNotifications: jest.fn(),
    setAutoBackup: jest.fn(),
    setHighQualityPhotos: jest.fn(),
    setCardSpacing: jest.fn(),
    setPhotoHeight: jest.fn(),
    setCalendarDensity: mockSetCalendarDensity,
    resetSettings: mockResetSettings,
  }),
  SPACING_VALUES: { compact: 8, default: 16, loose: 24 },
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/utils/fileSystem', () => ({
  getStorageStats: jest.fn(async () => ({ totalSize: 1024 })),
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { clearSoundCache: jest.fn() },
}));

jest.mock('@/src/services/notificationService', () => ({
  NotificationService: {
    isReminderScheduled: jest.fn(async () => false),
    requestPermission: jest.fn(async () => true),
    scheduleDailyReminder: jest.fn(async () => undefined),
    cancelDailyReminder: jest.fn(async () => undefined),
  },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text> };
});

jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../TagManagementPage', () => ({
  TagManagementPage: () => null,
}));

describe('SettingsPage calendar density selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar density setting with default option selected', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    expect(screen.getByText('日历内容区密度')).toBeTruthy();
    expect(screen.getByText('调整日历视图中卡片和时间轴的疏密程度')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
  });

  it('calls setCalendarDensity when user switches option', async () => {
    const screen = render(<SettingsPage visible onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('舒展'));

    expect(mockSetCalendarDensity).toHaveBeenCalledWith('comfortable');
  });
});
