import React from 'react';
import { Switch } from 'react-native';
import type {
  CalendarDensity,
  CardSpacing,
  PhotoHeightPreset,
} from '@/src/store/settingsStore';
import {
  SETTINGS_SWITCH_TRACK_COLORS,
} from './SettingsPage.styles';
import { SettingsAccountSyncSection } from './SettingsAccountSyncSection';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsDataStorageSection } from './SettingsDataStorageSection';
import { SettingsE2ESyncLab } from './SettingsE2ESyncLab';
import { SettingsGroupCard } from './SettingsGroupCard';
import { SettingsPhotoHeightSelector } from './SettingsPhotoHeightSelector';
import { SettingsProfileCard } from './SettingsProfileCard';
import { SettingsSection } from './SettingsSection';
import { SettingsSegmentedSelector } from './SettingsSegmentedSelector';
import {
  CALENDAR_DENSITY_OPTIONS,
  CARD_SPACING_OPTIONS,
} from './settingsPageOptions';

interface SettingsPageContentProps {
  isAuthenticated: boolean;
  userEmail?: string;
  cloudMode: boolean | 'switching';
  isSwitchingMode: boolean;
  notifications: boolean;
  highQualityPhotos: boolean;
  cardSpacing: CardSpacing;
  photoHeight: PhotoHeightPreset;
  calendarDensity: CalendarDensity;
  usedSpace: string;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
  currentServerUrl: string;
  backendDraftUrl: string;
  recentServerUrls: string[];
  backendTestStatus: 'idle' | 'testing' | 'success' | 'error';
  backendTestErrorMessage: string | null;
  isSavingBackendServer: boolean;
  canSaveBackendServer: boolean;
  showE2ESyncLab?: boolean;
  onCloudModeToggle: (value: boolean) => void | Promise<void>;
  onShowSyncStatus: () => void | Promise<void>;
  onSwitchAccount: () => void;
  onLogout: () => void;
  onShowLogin: () => void;
  onNotificationsChange: (value: boolean) => void | Promise<void>;
  onHighQualityPhotosChange: (value: boolean) => void | Promise<void>;
  onCardSpacingChange: (value: CardSpacing) => void | Promise<void>;
  onPhotoHeightChange: (value: PhotoHeightPreset) => void | Promise<void>;
  onCalendarDensityChange: (value: CalendarDensity) => void | Promise<void>;
  onBackendDraftUrlChange: (value: string) => void;
  onTestBackendServer: () => void | Promise<void>;
  onSaveBackendServer: () => void | Promise<void>;
  onSelectRecentBackendServer: (url: string) => void;
  onClearCache: () => void;
  onInjectSuspectRepairable?: () => void | Promise<void>;
  onInjectRepairPending?: () => void | Promise<void>;
  onInjectTextDetailFixture?: () => void | Promise<void>;
  onClearSyncFixtures?: () => void | Promise<void>;
  onShowSyncRepairPrompt?: () => void;
  onOpenTagManagement: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
  onResetSettings: () => void;
}

export function SettingsPageContent({
  isAuthenticated,
  userEmail,
  cloudMode,
  isSwitchingMode,
  notifications,
  highQualityPhotos,
  cardSpacing,
  photoHeight,
  calendarDensity,
  usedSpace,
  entryCount,
  photoCount,
  currentServerUrl,
  backendDraftUrl,
  recentServerUrls,
  backendTestStatus,
  backendTestErrorMessage,
  isSavingBackendServer,
  canSaveBackendServer,
  showE2ESyncLab,
  onCloudModeToggle,
  onShowSyncStatus,
  onSwitchAccount,
  onLogout,
  onShowLogin,
  onNotificationsChange,
  onHighQualityPhotosChange,
  onCardSpacingChange,
  onPhotoHeightChange,
  onCalendarDensityChange,
  onBackendDraftUrlChange,
  onTestBackendServer,
  onSaveBackendServer,
  onSelectRecentBackendServer,
  onClearCache,
  onInjectSuspectRepairable,
  onInjectRepairPending,
  onInjectTextDetailFixture,
  onClearSyncFixtures,
  onShowSyncRepairPrompt,
  onOpenTagManagement,
  onOpenHelp,
  onOpenAbout,
  onResetSettings,
}: SettingsPageContentProps) {
  return (
    <>
      <SettingsProfileCard
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        cloudMode={cloudMode}
        entryCount={entryCount}
        photoCount={photoCount}
        usedSpace={usedSpace}
        onShowLogin={onShowLogin}
      />

      <SettingsAccountSyncSection
        isAuthenticated={isAuthenticated}
        cloudMode={cloudMode}
        isSwitchingMode={isSwitchingMode}
        onCloudModeToggle={onCloudModeToggle}
        onShowSyncStatus={onShowSyncStatus}
        onSwitchAccount={onSwitchAccount}
        onLogout={onLogout}
        onShowLogin={onShowLogin}
        currentServerUrl={currentServerUrl}
        backendDraftUrl={backendDraftUrl}
        recentServerUrls={recentServerUrls}
        backendTestStatus={backendTestStatus}
        backendTestErrorMessage={backendTestErrorMessage}
        isSavingBackendServer={isSavingBackendServer}
        canSaveBackendServer={canSaveBackendServer}
        onBackendDraftUrlChange={onBackendDraftUrlChange}
        onTestBackendServer={onTestBackendServer}
        onSaveBackendServer={onSaveBackendServer}
        onSelectRecentBackendServer={onSelectRecentBackendServer}
      />

      <SettingsSection title="外观">
        <SettingsGroupCard>
          <SettingItem
            icon="notifications"
            title="推送通知"
            subtitle="接收提醒和更新"
            rightComponent={(
              <Switch
                testID="settings-switch-notifications"
                value={notifications}
                onValueChange={onNotificationsChange}
                trackColor={SETTINGS_SWITCH_TRACK_COLORS}
                thumbColor="#FFFFFF"
              />
            )}
          />
          <SettingsSegmentedSelector
            icon="albums"
            title="卡片间距"
            subtitle="调整记录卡片之间的间距"
            options={CARD_SPACING_OPTIONS}
            value={cardSpacing}
            onChange={onCardSpacingChange}
          />
          <SettingsSegmentedSelector
            icon="calendar-outline"
            title="日历密度"
            subtitle="调整日历视图中卡片和时间轴的疏密程度"
            options={CALENDAR_DENSITY_OPTIONS}
            value={calendarDensity}
            onChange={onCalendarDensityChange}
          />
          <SettingsPhotoHeightSelector
            value={photoHeight}
            onChange={onPhotoHeightChange}
          />
        </SettingsGroupCard>
      </SettingsSection>

      <SettingsDataStorageSection
        highQualityPhotos={highQualityPhotos}
        onHighQualityPhotosChange={onHighQualityPhotosChange}
        onOpenTagManagement={onOpenTagManagement}
        onClearCache={onClearCache}
        onResetSettings={onResetSettings}
      />

      <SettingsSection title="关于与支持">
        <SettingsGroupCard>
          <SettingButton
            icon="help-circle"
            title="帮助与反馈"
            subtitle="查看常见问题并联系支持"
            testID="settings-open-help"
            onPress={onOpenHelp}
          />
          <SettingButton
            icon="information-circle"
            title="关于"
            subtitle="查看应用信息与技术栈"
            testID="settings-open-about"
            onPress={onOpenAbout}
          />
        </SettingsGroupCard>
      </SettingsSection>

      {showE2ESyncLab ? (
        <SettingsE2ESyncLab
          onInjectSuspectRepairable={onInjectSuspectRepairable ?? (() => undefined)}
          onInjectRepairPending={onInjectRepairPending ?? (() => undefined)}
          onInjectTextDetailFixture={onInjectTextDetailFixture ?? (() => undefined)}
          onClearFixtures={onClearSyncFixtures ?? (() => undefined)}
          onShowRepairPrompt={onShowSyncRepairPrompt ?? (() => undefined)}
        />
      ) : null}
    </>
  );
}
