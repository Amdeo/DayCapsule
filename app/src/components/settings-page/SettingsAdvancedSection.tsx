import React, { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsBackendServerCard } from './SettingsBackendServerCard';
import { settingsPageStyles } from './SettingsPage.styles';
import { SettingsSection } from './SettingsSection';

interface SettingsAdvancedSectionProps {
  currentServerUrl: string;
  backendDraftUrl: string;
  recentServerUrls: string[];
  backendTestStatus: 'idle' | 'testing' | 'success' | 'error';
  backendTestErrorMessage: string | null;
  isSavingBackendServer: boolean;
  canSaveBackendServer: boolean;
  onBackendDraftUrlChange: (value: string) => void;
  onTestBackendServer: () => void | Promise<void>;
  onSaveBackendServer: () => void | Promise<void>;
  onSelectRecentBackendServer: (url: string) => void;
  standalone?: boolean;
  toggleTestID?: string;
}

export function SettingsAdvancedSection({
  currentServerUrl,
  backendDraftUrl,
  recentServerUrls,
  backendTestStatus,
  backendTestErrorMessage,
  isSavingBackendServer,
  canSaveBackendServer,
  onBackendDraftUrlChange,
  onTestBackendServer,
  onSaveBackendServer,
  onSelectRecentBackendServer,
  standalone = true,
  toggleTestID = 'settings-advanced-toggle',
}: SettingsAdvancedSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const card = (
    <View style={[settingsPageStyles.advancedSectionCard, !standalone && settingsPageStyles.advancedSectionEmbeddedCard]}>
      <Pressable testID={toggleTestID} style={settingsPageStyles.advancedSectionHeader} onPress={toggle}>
        <View style={settingsPageStyles.advancedSectionIconBox}>
          <Ionicons name="server-outline" size={18} color="#6B7280" />
        </View>
        <View style={settingsPageStyles.advancedSectionHeaderText}>
          <Text style={settingsPageStyles.advancedSectionTitle}>后端服务器</Text>
          <Text style={settingsPageStyles.advancedSectionSubtitle} numberOfLines={1} ellipsizeMode="middle">
            {currentServerUrl || '点击配置后端服务器'}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#D1D5DB"
          style={expanded ? settingsPageStyles.advancedSectionArrowExpanded : undefined}
        />
      </Pressable>
      {expanded && (
        <View style={settingsPageStyles.advancedSectionContent}>
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
        </View>
      )}
    </View>
  );

  if (!standalone) {
    return card;
  }

  return (
    <SettingsSection title="高级">
      {card}
    </SettingsSection>
  );
}
