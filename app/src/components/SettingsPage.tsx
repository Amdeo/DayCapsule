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
import { showCloudSyncStatusAlert } from '@/src/services/showCloudSyncStatusAlert';
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
    onRequireLogin: () => openLogin(),
  });

  const {
    usedSpace,
    showTagMgmt,
    showLogin,
    photoCount,
    voiceCount,
    openTagManagement,
    closeTagManagement,
    openLogin,
    closeLogin,
    handleLoginSuccess,
    handleNotifications,
    handleAutoBackup,
    handleHighQualityPhotos,
    handleCardSpacing,
    handlePhotoHeight,
    handleCalendarDensity,
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
    enableCloudMode,
  });

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
          onCloudModeToggle={handleCloudModeToggle}
          onShowSyncStatus={() => {
            void showCloudSyncStatusAlert();
          }}
          onLogout={handleLogout}
          onShowLogin={openLogin}
          onNotificationsChange={handleNotifications}
          onAutoBackupChange={handleAutoBackup}
          onHighQualityPhotosChange={handleHighQualityPhotos}
          onCardSpacingChange={handleCardSpacing}
          onPhotoHeightChange={handlePhotoHeight}
          onCalendarDensityChange={handleCalendarDensity}
          onClearCache={handleClearCache}
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
