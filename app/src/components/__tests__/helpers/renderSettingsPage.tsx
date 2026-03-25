import React, { ComponentProps } from 'react';
import { render } from '@testing-library/react-native';
import { SettingsPage } from '../../SettingsPage';

type SettingsPageProps = ComponentProps<typeof SettingsPage>;

const mockEntryStoreState = {
  entries: [] as unknown[],
};

const mockSettingsState = {
  notifications: false,
  autoBackup: false,
  highQualityPhotos: true,
  cardSpacing: 'default',
  photoHeight: 'default',
  calendarDensity: 'default',
  cloudMode: false as boolean | 'switching',
  isLoaded: true,
  loadSettings: jest.fn(),
  setNotifications: jest.fn(),
  setAutoBackup: jest.fn(),
  setHighQualityPhotos: jest.fn(),
  setCardSpacing: jest.fn(),
  setPhotoHeight: jest.fn(),
  setCalendarDensity: jest.fn(),
  setCloudMode: jest.fn(),
  resetSettings: jest.fn(),
};

const mockAuthState = {
  user: null as { email: string } | null,
  isAuthenticated: false,
  logout: jest.fn(),
};

const mockCloudModeState = {
  isSwitchingMode: false,
  enableCloudMode: jest.fn(),
  handleCloudModeToggle: jest.fn(),
  handleLogout: jest.fn(),
};

const mockControllerState = {
  usedSpace: '< 0.1 MB',
  showTagMgmt: false,
  showLogin: false,
  photoCount: 0,
  voiceCount: 0,
  currentServerUrl: '',
  backendDraftUrl: '',
  recentServerUrls: [] as string[],
  backendTestStatus: null as string | null,
  backendTestErrorMessage: '',
  isSavingBackendServer: false,
  canSaveBackendServer: false,
  openTagManagement: jest.fn(),
  closeTagManagement: jest.fn(),
  openLogin: jest.fn(),
  closeLogin: jest.fn(),
  handleLoginSuccess: jest.fn(),
  handleNotifications: jest.fn(),
  handleAutoBackup: jest.fn(),
  handleHighQualityPhotos: jest.fn(),
  handleCardSpacing: jest.fn(),
  handlePhotoHeight: jest.fn(),
  handleCalendarDensity: jest.fn(),
  handleBackendDraftUrlChange: jest.fn(),
  handleTestBackendServer: jest.fn(),
  handleSaveBackendServer: jest.fn(),
  handleSelectRecentBackendServer: jest.fn(),
  handleClearCache: jest.fn(),
  handleResetSettings: jest.fn(),
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => mockEntryStoreState,
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => mockSettingsState,
  SPACING_VALUES: { compact: 8, default: 16, loose: 24 },
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/store/authStore', () => ({
  useAuthStore: () => mockAuthState,
}));

jest.mock('../../settings-page/useSettingsPageCloudMode', () => ({
  useSettingsPageCloudMode: () => mockCloudModeState,
}));

jest.mock('../../settings-page/useSettingsPageController', () => ({
  useSettingsPageController: () => mockControllerState,
}));

jest.mock('@/src/services/e2eSyncLabService', () => ({
  createE2ESyncLabService: jest.fn(() => ({
    injectSuspectRepairable: jest.fn(),
    injectRepairPending: jest.fn(),
    clearFixtures: jest.fn(),
  })),
}));

jest.mock('../../settings-page/SettingsPageDialogs', () => ({
  SettingsPageDialogs: () => null,
}));

export interface RenderSettingsPageOptions {
  props?: Partial<SettingsPageProps>;
  auth?: Partial<typeof mockAuthState>;
  settings?: Partial<typeof mockSettingsState>;
  entryStore?: Partial<typeof mockEntryStoreState>;
  cloudMode?: Partial<typeof mockCloudModeState>;
  controller?: Partial<typeof mockControllerState>;
}

export function renderSettingsPage(overrides: RenderSettingsPageOptions = {}) {
  Object.assign(mockAuthState, {
    user: null,
    isAuthenticated: false,
    logout: jest.fn(),
    ...overrides.auth,
  });
  Object.assign(mockSettingsState, {
    notifications: false,
    autoBackup: false,
    highQualityPhotos: true,
    cardSpacing: 'default',
    photoHeight: 'default',
    calendarDensity: 'default',
    cloudMode: false,
    isLoaded: true,
    loadSettings: jest.fn(),
    setNotifications: jest.fn(),
    setAutoBackup: jest.fn(),
    setHighQualityPhotos: jest.fn(),
    setCardSpacing: jest.fn(),
    setPhotoHeight: jest.fn(),
    setCalendarDensity: jest.fn(),
    setCloudMode: jest.fn(),
    resetSettings: jest.fn(),
    ...overrides.settings,
  });
  Object.assign(mockEntryStoreState, {
    entries: [],
    ...overrides.entryStore,
  });
  Object.assign(mockCloudModeState, {
    isSwitchingMode: false,
    enableCloudMode: jest.fn(),
    handleCloudModeToggle: jest.fn(),
    handleLogout: jest.fn(),
    ...overrides.cloudMode,
  });
  Object.assign(mockControllerState, {
    usedSpace: '< 0.1 MB',
    showTagMgmt: false,
    showLogin: false,
    photoCount: 0,
    voiceCount: 0,
    currentServerUrl: '',
    backendDraftUrl: '',
    recentServerUrls: [],
    backendTestStatus: null,
    backendTestErrorMessage: '',
    isSavingBackendServer: false,
    canSaveBackendServer: false,
    openTagManagement: jest.fn(),
    closeTagManagement: jest.fn(),
    openLogin: jest.fn(),
    closeLogin: jest.fn(),
    handleLoginSuccess: jest.fn(),
    handleNotifications: jest.fn(),
    handleAutoBackup: jest.fn(),
    handleHighQualityPhotos: jest.fn(),
    handleCardSpacing: jest.fn(),
    handlePhotoHeight: jest.fn(),
    handleCalendarDensity: jest.fn(),
    handleBackendDraftUrlChange: jest.fn(),
    handleTestBackendServer: jest.fn(),
    handleSaveBackendServer: jest.fn(),
    handleSelectRecentBackendServer: jest.fn(),
    handleClearCache: jest.fn(),
    handleResetSettings: jest.fn(),
    ...overrides.controller,
  });

  const props: SettingsPageProps = {
    visible: true,
    onClose: jest.fn(),
    ...overrides.props,
  };

  return {
    props,
    mocks: {
      auth: mockAuthState,
      settings: mockSettingsState,
      entryStore: mockEntryStoreState,
      cloudMode: mockCloudModeState,
      controller: mockControllerState,
    },
    screen: render(<SettingsPage {...props} />),
  };
}
