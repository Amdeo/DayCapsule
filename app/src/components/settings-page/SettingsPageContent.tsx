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
import { SettingsBackendServerCard } from './SettingsBackendServerCard';
import { SettingButton, SettingItem } from './SettingRow';
import { SettingsPhotoHeightSelector } from './SettingsPhotoHeightSelector';
import { SettingsSection } from './SettingsSection';
import { SettingsSegmentedSelector } from './SettingsSegmentedSelector';
import { SettingsStorageInfo } from './SettingsStorageInfo';
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
  onResetSettings,
}: SettingsPageContentProps) {
  return (
    <>
      <SettingsSection title="后端">
        <SettingsBackendServerCard
          currentServerUrl={currentServerUrl}
          draftServerUrl={backendDraftUrl}
          recentServerUrls={recentServerUrls}
          testStatus={backendTestStatus}
          testErrorMessage={backendTestErrorMessage}
          isSaving={isSavingBackendServer}
          canSave={canSaveBackendServer}
          onChangeDraftUrl={onBackendDraftUrlChange}
          onTestConnection={onTestBackendServer}
          onSave={onSaveBackendServer}
          onSelectRecentServer={onSelectRecentBackendServer}
        />
      </SettingsSection>

      <SettingsSection title="账户">
        {isAuthenticated ? (
          <>
            <SettingItem icon="person" title={userEmail ?? ''} subtitle="已登录" />
            <SettingItem
              icon="cloud"
              title="云端模式"
              subtitle={cloudMode === 'switching' ? '切换中...' : cloudMode ? '数据存储在云端' : '数据存储在本地'}
              rightComponent={(
                <Switch
                  testID="settings-switch-cloud-mode"
                  value={cloudMode === true}
                  onValueChange={onCloudModeToggle}
                  disabled={cloudMode === 'switching' || isSwitchingMode}
                  trackColor={SETTINGS_SWITCH_TRACK_COLORS}
                  thumbColor="#FFFFFF"
                />
              )}
            />
            <SettingButton
              icon="cloud-done"
              title="同步状态"
              subtitle="查看最近同步时间和待同步条数"
              testID="settings-show-sync-status"
              onPress={onShowSyncStatus}
            />
            <SettingButton
              icon="log-out"
              title="退出登录"
              subtitle="退出当前账户"
              onPress={onLogout}
              danger
            />
          </>
        ) : (
          <SettingButton
            icon="person-add"
            title="登录 / 注册"
            subtitle="登录后可使用云端同步功能"
            testID="settings-open-login"
            onPress={onShowLogin}
          />
        )}
      </SettingsSection>

      <SettingsSection title="通知">
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

      <SettingsSection title="数据">
        <SettingItem
          icon="image"
          title="高质量照片"
          subtitle="保存原始质量照片"
          rightComponent={(
            <Switch
              testID="settings-switch-high-quality-photos"
              value={highQualityPhotos}
              onValueChange={onHighQualityPhotosChange}
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
        <SettingButton
          icon="trash"
          title="清除缓存"
          subtitle="清空本地记录、媒体和缓存"
          onPress={onClearCache}
        />
      </SettingsSection>

      <SettingsSection title="存储">
        <SettingsStorageInfo
          usedSpace={usedSpace}
          entryCount={entryCount}
          photoCount={photoCount}
          voiceCount={voiceCount}
        />
      </SettingsSection>

      <SettingsSection title="其他">
        <SettingButton
          icon="pricetag"
          title="预制标签管理"
          subtitle="管理可快速选择的预制标签"
          testID="settings-open-tag-management"
          onPress={onOpenTagManagement}
        />
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
