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
import { showCloudSyncMonitor } from '@/src/services/showCloudSyncMonitor';
import { showPhotoRepairPrompt } from '@/src/services/showPhotoRepairPrompt';
import { DetailPageShell } from './DetailPageShell';
import { useAuthStore } from '@/src/store/authStore';
import { SettingsPageContent } from './settings-page/SettingsPageContent';
import { useSettingsPageController } from './settings-page/useSettingsPageController';
import { SettingsPageDialogs } from './settings-page/SettingsPageDialogs';
import { useAccountSwitcher } from './settings-page/useAccountSwitcher';
import { useConfirmDialogStore } from '@/src/store/confirmDialogStore';
import { useErrorFeedbackStore } from '@/src/store/errorFeedbackStore';
import { buildWorkspaceSessionSnapshot } from '@/src/services/workspaceSessionState';
import { promptEnableCloudProtection } from '@/src/services/cloudProtectionPromptService';
import { useSyncStore } from '@/src/store/syncStore';

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
    highQualityPhotos,
    cardSpacing,
    isLoaded,
    loadSettings,
    setNotifications: saveNotifications,
    setHighQualityPhotos: saveHighQualityPhotos,
    setCardSpacing: saveCardSpacing,
    photoHeight,
    setPhotoHeight: savePhotoHeight,
    calendarDensity,
    setCalendarDensity: saveCalendarDensity,
  } = useSettingsStore();
  const isCloudProtectionEnabled = useSyncStore((state) => state.isCloudProtectionEnabled);

  const { user, isAuthenticated, logout } = useAuthStore();
  const { isAccountScopeActive, isTransitioning } = buildWorkspaceSessionSnapshot(isAuthenticated);
  const [showLogin, setShowLogin] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [showAbout, setShowAbout] = React.useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = React.useState(false);

  const {
    accounts,
    activeRef,
    isSwitching,
    handleSwitch,
    refresh: refreshAccountSwitcher,
  } = useAccountSwitcher();

  const openHelp = React.useCallback(() => {
    setShowAbout(false);
    setShowHelp(true);
  }, []);

  const openAbout = React.useCallback(() => {
    setShowHelp(false);
    setShowAbout(true);
  }, []);

  const openLogin = React.useCallback(() => {
    setShowLogin(true);
  }, []);

  const closeLogin = React.useCallback(() => {
    setShowLogin(false);
  }, []);

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
    handleHighQualityPhotos,
    handleCardSpacing,
    handlePhotoHeight,
    handleCalendarDensity,
    handleBackendDraftUrlChange,
    handleTestBackendServer,
    handleSaveBackendServer,
    handleSelectRecentBackendServer,
    handleClearCache,
  } = useSettingsPageController({
    visible,
    entries,
    isLoaded,
    notifications,
    loadSettings,
    saveNotifications,
    saveHighQualityPhotos,
    saveCardSpacing,
    savePhotoHeight,
    saveCalendarDensity,
  });

  const handleLoginSuccess = React.useCallback(async () => {
    closeLogin();
    await refreshAccountSwitcher();
    const { isCloudProtectionEnabled, setCloudProtectionEnabled } = useSyncStore.getState();
    if (!isCloudProtectionEnabled) {
      promptEnableCloudProtection({
        onEnable: async () => setCloudProtectionEnabled(true),
      });
    }
  }, [closeLogin, refreshAccountSwitcher]);

  const handleEnableCloudProtection = React.useCallback(() => {
    promptEnableCloudProtection({
      onEnable: async () => {
        await useSyncStore.getState().setCloudProtectionEnabled(true);
      },
    });
  }, []);

  const openAccountSwitcher = React.useCallback(async () => {
    await refreshAccountSwitcher();
    setShowAccountSwitcher(true);
  }, [refreshAccountSwitcher]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <DetailPageShell visible={visible} title="设置" onClose={handleClose}>
      <View testID="settings-page-root">
        <SettingsPageContent
          isAuthenticated={isAuthenticated}
          isCloudProtectionEnabled={isCloudProtectionEnabled}
          userEmail={user?.email}
          isAccountScopeActive={isAccountScopeActive}
          isTransitioning={isTransitioning}
          notifications={notifications}
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
          onEnableCloudProtection={handleEnableCloudProtection}
          onShowSyncStatus={() => {
            showCloudSyncMonitor();
          }}
          onSwitchAccount={openAccountSwitcher}
          onLogout={logout}
          onShowLogin={openLogin}
          onNotificationsChange={handleNotifications}
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
          onOpenHelp={openHelp}
          onOpenAbout={openAbout}
        />
        <SettingsPageDialogs
          showTagMgmt={showTagMgmt}
          showLogin={showLogin}
          showHelp={showHelp}
          showAbout={showAbout}
          showAccountSwitcher={showAccountSwitcher}
          accounts={accounts}
          activeRef={activeRef}
          isSwitching={isSwitching}
          onCloseTagManagement={closeTagManagement}
          onCloseLogin={closeLogin}
          onCloseHelp={() => setShowHelp(false)}
          onCloseAbout={() => setShowAbout(false)}
          onCloseAccountSwitcher={() => setShowAccountSwitcher(false)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchAccount={handleSwitch}
          onAddAccount={openLogin}
        />
      </View>
    </DetailPageShell>
  );
}

export { CardSpacing, SPACING_VALUES, PhotoHeightPreset, PHOTO_HEIGHT_VALUES };
