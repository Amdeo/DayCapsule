import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsBackendServerCard } from './SettingsBackendServerCard';
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
}: SettingsAdvancedSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <SettingsSection title="高级">
      <View style={styles.card}>
        <Pressable testID="settings-advanced-toggle" style={styles.header} onPress={toggle}>
          <View style={styles.iconBox}>
            <Ionicons name="server-outline" size={18} color="#6B7280" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>后端服务器</Text>
            <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="middle">
              {currentServerUrl}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color="#D1D5DB"
            style={expanded ? styles.arrowExpanded : undefined}
          />
        </Pressable>
        {expanded && (
          <View style={styles.content}>
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
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  arrowExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
