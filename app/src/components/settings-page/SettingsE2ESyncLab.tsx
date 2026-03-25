import React from 'react';
import { View } from 'react-native';
import { SettingButton } from './SettingRow';
import { SettingsSection } from './SettingsSection';

interface SettingsE2ESyncLabProps {
  onInjectSuspectRepairable: () => void | Promise<void>;
  onInjectRepairPending: () => void | Promise<void>;
  onClearFixtures: () => void | Promise<void>;
  onShowRepairPrompt: () => void;
}

export function SettingsE2ESyncLab({
  onInjectSuspectRepairable,
  onInjectRepairPending,
  onClearFixtures,
  onShowRepairPrompt,
}: SettingsE2ESyncLabProps) {
  return (
    <SettingsSection title="E2E Sync Lab">
      <View testID="e2e-sync-lab-root">
        <SettingButton
          icon="warning"
          title="注入 suspect + repairable"
          subtitle="写入 1 条可修复异常媒体，便于 Maestro 回归"
          testID="e2e-sync-fixture-suspect"
          onPress={() => {
            void onInjectSuspectRepairable();
          }}
        />
        <SettingButton
          icon="time"
          title="注入 repair_pending"
          subtitle="模拟用户确认修复后的待同步状态"
          testID="e2e-sync-fixture-repair-pending"
          onPress={() => {
            void onInjectRepairPending();
          }}
        />
        <SettingButton
          icon="build"
          title="显示修复提示"
          subtitle="直接拉起异常媒体修复确认弹窗"
          testID="e2e-sync-show-repair-prompt"
          onPress={onShowRepairPrompt}
        />
        <SettingButton
          icon="trash"
          title="清空同步测试数据"
          subtitle="重置媒体摘要和修复 issue"
          testID="e2e-sync-fixture-clear"
          onPress={() => {
            void onClearFixtures();
          }}
        />
      </View>
    </SettingsSection>
  );
}
