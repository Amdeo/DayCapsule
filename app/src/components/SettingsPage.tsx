/**
 * 设置页面组件
 * 使用 settingsStore 共享状态
 */

import React from 'react';
import { View } from 'react-native';
import { useEntryStore } from '@/src/store/entryStore';
import {
  useSettingsStore,
  CardSpacing, SPACING_VALUES,
  PhotoHeightPreset, PHOTO_HEIGHT_VALUES,
} from '@/src/store/settingsStore';
import { createE2ESyncLabService } from '@/src/services/e2eSyncLabService';
import { showCloudSyncStatusAlert } from '@/src/services/showCloudSyncStatusAlert';
import { showPhotoRepairPrompt } from '@/src/services/showPhotoRepairPrompt';
import { DetailPageShell } from './DetailPageShell';
import { useAuthStore } from '@/src/store/authStore';
import { SettingsPageContent } from './settings-page/SettingsPageContent';
import { useSettingsPageCloudMode } from './settings-page/useSettingsPageCloudMode';
import { useSettingsPageController } from './settings-page/useSettingsPageController';
import { SettingsPageDialogs } from './settings-page/SettingsPageDialogs';

interface SettingsPageProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsPage({ visible, onClose }: SettingsPageProps) {
  const { entries } = useEntryStore();
  const showE2ESyncLab = process.env.EXPO_PUBLIC_E2E_SYNC_LAB === '1';
  const e2eSyncLabService = createE2ESyncLabService();

  const {
    notifications,
    autoBackup,
    highQualityPhotos,
    cardSpacing,
    isLoaded,
    loadSettings,
    setNotifications: saveNotifications,
    setAutoBackup: saveAutoBackup,
    setHighQualityPhotos: saveHighQualityPhotos,
    setCardSpacing: saveCardSpacing,
    photoHeight,
    setPhotoHeight: savePhotoHeight,
    calendarDensity,
    setCalendarDensity: saveCalendarDensity,
    cloudMode,
    setCloudMode,
    resetSettings,
  } = useSettingsStore();

  const { user, isAuthenticated, logout } = useAuthStore();
  const [showLogin, setShowLogin] = React.useState(false);
  const [loginIntent, setLoginIntent] = React.useState<'account' | 'cloud-gating' | null>(null);

  const openLogin = React.useCallback((intent: 'account' | 'cloud-gating' = 'account') => {
    setLoginIntent(intent);
    setShowLogin(true);
  }, []);

  const closeLogin = React.useCallback(() => {
    setShowLogin(false);
    setLoginIntent(null);
  }, []);

  const {
    isSwitchingMode,
    enableCloudMode,
    handleCloudModeToggle,
    handleLogout,
  } = useSettingsPageCloudMode({
    isAuthenticated,
    cloudMode,
    setCloudMode,
    logout,
    onRequireLogin: () => openLogin('cloud-gating'),
  });

  const {
    usedSpace,
    showTagMgmt,
    photoCount,
    voiceCount,
    currentServerUrl,
    backendDraftUrl,
    recentServerUrls,
    backendTestStatus,
    backendTestErrorMessage,
    isSavingBackendServer,
    canSaveBackendServer,
    openTagManagement,
    closeTagManagement,
    handleNotifications,
    handleAutoBackup,
    handleHighQualityPhotos,
    handleCardSpacing,
    handlePhotoHeight,
    handleCalendarDensity,
    handleBackendDraftUrlChange,
    handleTestBackendServer,
    handleSaveBackendServer,
    handleSelectRecentBackendServer,
    handleClearCache,
    handleResetSettings,
  } = useSettingsPageController({
    visible,
    entries,
    isLoaded,
    notifications,
    loadSettings,
    saveNotifications,
    saveAutoBackup,
    saveHighQualityPhotos,
    saveCardSpacing,
    savePhotoHeight,
    saveCalendarDensity,
    resetSettings,
  });

  const handleLoginSuccess = React.useCallback(async () => {
    const intent = loginIntent;
    closeLogin();
    if (intent === 'cloud-gating') {
      await enableCloudMode();
    }
  }, [closeLogin, enableCloudMode, loginIntent]);

  return (
    <DetailPageShell visible={visible} title="设置" onClose={onClose}>
      <View testID="settings-page-root">
        <SettingsPageContent
          isAuthenticated={isAuthenticated}
          userEmail={user?.email}
          cloudMode={cloudMode}
          isSwitchingMode={isSwitchingMode}
          notifications={notifications}
          autoBackup={autoBackup}
          highQualityPhotos={highQualityPhotos}
          cardSpacing={cardSpacing}
          photoHeight={photoHeight}
          calendarDensity={calendarDensity}
          usedSpace={usedSpace}
          entryCount={entries.length}
          photoCount={photoCount}
          voiceCount={voiceCount}
          currentServerUrl={currentServerUrl}
          backendDraftUrl={backendDraftUrl}
          recentServerUrls={recentServerUrls}
          backendTestStatus={backendTestStatus}
          backendTestErrorMessage={backendTestErrorMessage}
          isSavingBackendServer={isSavingBackendServer}
          canSaveBackendServer={canSaveBackendServer}
          showE2ESyncLab={showE2ESyncLab}
          onCloudModeToggle={handleCloudModeToggle}
          onShowSyncStatus={() => {
            void showCloudSyncStatusAlert();
          }}
          onLogout={handleLogout}
          onShowLogin={() => openLogin('account')}
          onNotificationsChange={handleNotifications}
          onAutoBackupChange={handleAutoBackup}
          onHighQualityPhotosChange={handleHighQualityPhotos}
          onCardSpacingChange={handleCardSpacing}
          onPhotoHeightChange={handlePhotoHeight}
          onCalendarDensityChange={handleCalendarDensity}
          onBackendDraftUrlChange={handleBackendDraftUrlChange}
          onTestBackendServer={handleTestBackendServer}
          onSaveBackendServer={handleSaveBackendServer}
          onSelectRecentBackendServer={handleSelectRecentBackendServer}
          onClearCache={handleClearCache}
          onInjectSuspectRepairable={() => e2eSyncLabService.injectSuspectRepairable()}
          onInjectRepairPending={() => e2eSyncLabService.injectRepairPending()}
          onInjectTextDetailFixture={() => e2eSyncLabService.injectTextDetailFixture()}
          onClearSyncFixtures={() => e2eSyncLabService.clearFixtures()}
          onShowSyncRepairPrompt={() => showPhotoRepairPrompt()}
          onOpenTagManagement={openTagManagement}
          onResetSettings={handleResetSettings}
        />
        <SettingsPageDialogs
          showTagMgmt={showTagMgmt}
          showLogin={showLogin}
          onCloseTagManagement={closeTagManagement}
          onCloseLogin={closeLogin}
          onLoginSuccess={handleLoginSuccess}
        />
      </View>
    </DetailPageShell>
  );
}

export { CardSpacing, SPACING_VALUES, PhotoHeightPreset, PHOTO_HEIGHT_VALUES };
