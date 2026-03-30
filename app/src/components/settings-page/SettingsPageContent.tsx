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
import { SettingsPhotoHeightSelector } from './SettingsPhotoHeightSelector';
import { SettingsOverviewCard } from './SettingsOverviewCard';
import { SettingsSection } from './SettingsSection';
import { SettingsSegmentedSelector } from './SettingsSegmentedSelector';
import { SettingsDataStorageSection } from './SettingsDataStorageSection';
import { SettingsE2ESyncLab } from './SettingsE2ESyncLab';
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
  voiceCount,
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
      <SettingsOverviewCard
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        cloudMode={cloudMode}
        currentServerUrl={currentServerUrl}
        usedSpace={usedSpace}
      />

      <SettingsAccountSyncSection
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        cloudMode={cloudMode}
        isSwitchingMode={isSwitchingMode}
        currentServerUrl={currentServerUrl}
        backendDraftUrl={backendDraftUrl}
        recentServerUrls={recentServerUrls}
        backendTestStatus={backendTestStatus}
        backendTestErrorMessage={backendTestErrorMessage}
        isSavingBackendServer={isSavingBackendServer}
        canSaveBackendServer={canSaveBackendServer}
        onCloudModeToggle={onCloudModeToggle}
        onShowSyncStatus={onShowSyncStatus}
        onLogout={onLogout}
        onShowLogin={onShowLogin}
        onBackendDraftUrlChange={onBackendDraftUrlChange}
        onTestBackendServer={onTestBackendServer}
        onSaveBackendServer={onSaveBackendServer}
        onSelectRecentBackendServer={onSelectRecentBackendServer}
      />

      <SettingsSection title="提醒">
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
      </SettingsSection>

      <SettingsSection title="内容显示">
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
          title="日历内容区密度"
          subtitle="调整日历视图中卡片和时间轴的疏密程度"
          options={CALENDAR_DENSITY_OPTIONS}
          value={calendarDensity}
          onChange={onCalendarDensityChange}
        />
        <SettingsPhotoHeightSelector
          value={photoHeight}
          onChange={onPhotoHeightChange}
        />
      </SettingsSection>

      <SettingsDataStorageSection
        highQualityPhotos={highQualityPhotos}
        usedSpace={usedSpace}
        entryCount={entryCount}
        photoCount={photoCount}
        voiceCount={voiceCount}
        onHighQualityPhotosChange={onHighQualityPhotosChange}
        onClearCache={onClearCache}
      />

      <SettingsSection title="标签管理">
        <SettingButton
          icon="pricetag"
          title="预制标签管理"
          subtitle="管理可快速选择的预制标签"
          testID="settings-open-tag-management"
          onPress={onOpenTagManagement}
        />
      </SettingsSection>

      <SettingsSection title="支持">
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
      </SettingsSection>

      <SettingsSection title="危险操作">
        <SettingButton
          icon="refresh"
          title="重置设置"
          subtitle="恢复默认设置"
          onPress={onResetSettings}
          danger
        />
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
