import React from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import type { EntryTypeMeta } from './entryEditorAppearance';
import { entryEditorStyles as styles } from './EntryEditor.styles';

interface EntryEditorContentProps {
  entry: Entry;
  typeMeta: EntryTypeMeta;
  content: string;
  onChangeContent: (value: string) => void;
}

export function EntryEditorContent({
  entry,
  typeMeta,
  content,
  onChangeContent,
}: EntryEditorContentProps) {
  return (
    <View style={styles.main}>
      <ScrollView
        testID="entry-editor-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View
          testID="entry-editor-type-badge"
          style={[
            styles.typeBadge,
            {
              borderColor: `${typeMeta.accent}33`,
              backgroundColor: `${typeMeta.accent}14`,
            },
          ]}
        >
          <Ionicons name={typeMeta.icon} size={15} color={typeMeta.accent} />
          <Text style={[styles.typeText, { color: typeMeta.accent }]}>
            {typeMeta.label}
          </Text>
        </View>

        <View testID="entry-editor-content-surface" style={styles.contentSurface}>
          <Text style={styles.surfaceLabel}>正文</Text>
          <TextInput
            testID="entry-editor-content-input"
            style={styles.contentInput}
            value={content}
            onChangeText={onChangeContent}
            placeholder="写下这段记忆..."
            placeholderTextColor="#B6AAA0"
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.metaLabel}>创建时间</Text>
          <Text style={styles.metaValue}>
            {new Date(entry.timestamp).toLocaleString('zh-CN')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
