import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, TouchableOpacity, Pressable, Animated } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme, IconButton, Chip, TextInput } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

import TagInput from '../../../features/capture/components/TagInput';
import MoodPicker from '../../../features/capture/components/MoodPicker';
import TranscriptEditor from '../../../features/voice/components/TranscriptEditor';

// Import the actual LifelogEntry type from database
import type { LifelogEntry } from '@services/storage/database';

// Use LifelogEntry directly instead of a separate Entry interface
type Entry = LifelogEntry;

interface EntryDetailsSheetProps {
  selectedEntry: Entry | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entryId: string) => void;
}

const EntryDetailsSheet: React.FC<EntryDetailsSheetProps> = ({ selectedEntry, isOpen, onClose, onEdit, onDelete }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const theme = useTheme();
  const styles = getStyles(theme);
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(selectedEntry?.content || '');
  const [editedTags, setEditedTags] = useState<string[]>(selectedEntry?.tags || []);
  const [editedMood, setEditedMood] = useState<string | undefined>(selectedEntry?.mood);

  // 遮罩层动画
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  // Update states when selectedEntry changes
  useEffect(() => {
    if (selectedEntry) {
      setEditedContent(selectedEntry.content || '');
      setEditedTags(selectedEntry.tags || []);
      setEditedMood(selectedEntry.mood);
      setIsEditing(false); // Exit editing mode when entry changes
    }
  }, [selectedEntry]);

  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
      setIsEditing(false); // Reset editing state on close
    }
  }, [onClose]);

  const handleEditPress = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (selectedEntry && onEdit) {
      const updatedEntry = {
        ...selectedEntry,
        content: editedContent,
        tags: editedTags,
        mood: editedMood,
      };
      onEdit(updatedEntry);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Revert changes
    if (selectedEntry) {
      setEditedContent(selectedEntry.content);
      setEditedTags(selectedEntry.tags || []);
      setEditedMood(selectedEntry.mood);
    }
  };

  const handleDeletePress = () => {
    if (!selectedEntry) return;

    Alert.alert(
      '删除记录',
      '您确定要删除这条记录吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          onPress: () => {
            onDelete?.(selectedEntry.id);
            onClose(); // Close sheet after deletion
          },
          style: 'destructive',
        },
      ]
    );
  };

  // 如果没有选中的记录，显示加载状态
  if (!selectedEntry) {
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={isOpen ? 1 : -1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          <View style={styles.scrollContent}>
            <Text style={styles.text}>正在加载记录详情...</Text>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }

  const resolveUri = (uri?: string | null) => {
    if (!uri) return null;
    // 本地文件路径需要加 file:// 前缀，远程链接原样返回
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://')) {
      return uri;
    }
    return `file://${uri}`;
  };

  const getMediaContent = () => {
    if (!selectedEntry) return null;

    if (selectedEntry.type === 'photo') {
      // 兼容三种来源：media 数组、thumbnailPath、mediaPath（数据库字段）
      let photoUri: string | null = null;
      if (selectedEntry.media && Array.isArray(selectedEntry.media) && selectedEntry.media.length > 0) {
        photoUri = selectedEntry.media[0].uri;
      } else if (selectedEntry.mediaPath) {
        photoUri = selectedEntry.mediaPath;
      } else if (selectedEntry.thumbnailPath) {
        photoUri = selectedEntry.thumbnailPath;
      }
      if (photoUri) {
        return <Image source={{ uri: resolveUri(photoUri) as string }} style={styles.mediaImage} />;
      }
      return null;
    }
    if (selectedEntry.type === 'voice') {
      const mediaPath =
        typeof selectedEntry.media === 'string'
          ? selectedEntry.media
          : selectedEntry.mediaPath || null;
      return (
        <View style={styles.audioPlayerContainer}>
          <TouchableOpacity onPress={() => {}}>
            <Text style={{ fontSize: 48, color: theme.colors.primary }}>▶️</Text>
          </TouchableOpacity>
          <Text style={styles.audioPathText}>
            录音文件: {mediaPath || '未知文件'}
            {selectedEntry.voiceDuration
              ? ` (${Math.floor(selectedEntry.voiceDuration / 60)}:${(selectedEntry.voiceDuration % 60)
                  .toString()
                  .padStart(2, '0')})`
              : ''}
          </Text>
          {/* TODO: Integrate actual AudioPlayer component here */}
        </View>
      );
    }
    return null;
  };

  // Handlers for TranscriptEditor
  const handleSaveEditedTranscript = (editedText: string) => {
    if (selectedEntry && selectedEntry.type === 'voice' && onEdit) {
      const updatedEntry = {
        ...selectedEntry,
        content: editedText,
      };
      onEdit(updatedEntry);
      setIsEditing(false);
    }
  };

  const handleCancelEditedTranscript = () => {
    setIsEditing(false);
    // Revert content
    if (selectedEntry) {
      setEditedContent(selectedEntry.content);
    }
  };

  const displayContent = selectedEntry.content || selectedEntry.transcription || '';
  const hasMedia =
    (selectedEntry.type === 'photo' &&
      ((selectedEntry.media && Array.isArray(selectedEntry.media) && selectedEntry.media.length > 0) ||
        selectedEntry.thumbnailPath ||
        selectedEntry.mediaPath)) ||
    (selectedEntry.type === 'voice' && (typeof selectedEntry.media === 'string' || !!selectedEntry.mediaPath));
  const hasTags = !!(selectedEntry.tags && selectedEntry.tags.length > 0);
  const hasMood = !!selectedEntry.mood;
  const hasContent = !!displayContent;
  const isTrulyEmpty = !hasMedia && !hasContent && !hasTags && !hasMood;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 1 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      containerStyle={styles.sheetContainer}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} onPress={onClose} />
      )}
    >
      <BottomSheetScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {isEditing && selectedEntry.type !== 'voice' ? (
            // Edit for non-voice entries
            <TextInput
              value={editedContent}
              onChangeText={setEditedContent}
              mode="flat"
              style={styles.editTitleInput}
              multiline
            />
          ) : (
            <Text style={styles.title}>
              {displayContent
                ? displayContent.substring(0, 50) + (displayContent.length > 50 ? '...' : '')
                : '无标题'}
            </Text>
          )}
          <View style={styles.actionButtons}>
            {isEditing && selectedEntry.type !== 'voice' ? (
              <>
                <TouchableOpacity onPress={handleSaveEdit} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>✅</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelEdit} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>❌</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleEditPress} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeletePress} style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <Text style={styles.timestamp}>
          {selectedEntry.timestamp ? new Date(selectedEntry.timestamp).toLocaleString() : '未知时间'}
        </Text>
        <Text style={styles.location}>{selectedEntry.location?.address || '无位置信息'}</Text>
        <Text style={styles.mood}>
          类型: {selectedEntry.type === 'photo' ? '照片' : selectedEntry.type === 'voice' ? '语音' : '文字'}
          {selectedEntry.mood ? ` · 心情: ${selectedEntry.mood}` : ''}
        </Text>

        {selectedEntry.type === 'voice' && isEditing ? (
          <TranscriptEditor
            initialText={selectedEntry.content || ''}
            onSave={handleSaveEditedTranscript}
            onCancel={handleCancelEditedTranscript}
          />
        ) : (
          <>
            {getMediaContent()}
            {displayContent ? (
              <Text style={styles.fullContent}>{displayContent}</Text>
            ) : (
              <Text style={styles.placeholderText}>暂无正文</Text>
            )}
          </>
        )}

        <Text style={styles.editSectionTitle}>标签:</Text>
        {isEditing ? (
          <TagInput tags={editedTags} onTagsChange={setEditedTags} testID="entry-tags-input" />
        ) : selectedEntry.tags && selectedEntry.tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {selectedEntry.tags.map((tag) => (
              <Chip key={tag} style={styles.tagChip} textStyle={styles.tagChipText}>
                <Text>#{tag}</Text>
              </Chip>
            ))}
          </View>
        ) : (
          <Text style={styles.text}>无标签</Text>
        )}

        <Text style={styles.editSectionTitle}>心情:</Text>
        {isEditing ? (
          <MoodPicker selectedMood={editedMood} onMoodChange={setEditedMood} testID="entry-mood-picker" />
        ) : selectedEntry.mood ? (
          <Text style={styles.moodEmoji}>{selectedEntry.mood}</Text>
        ) : (
          <Text style={styles.text}>无心情记录</Text>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    bottomSheetBackground: {
      backgroundColor: theme.colors.background,
    },
    handleIndicator: {
      backgroundColor: theme.colors.outline,
    },
    sheetContainer: {
      backgroundColor: 'transparent',
      zIndex: 2000,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      marginTop: 8,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
      marginRight: 12,
    },
    editTitleInput: {
      flex: 1,
      marginRight: 12,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
    },
    actionButtonText: {
      fontSize: 20,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    location: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    mood: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
    },
    mediaImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 12,
    },
    audioPlayerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    audioPathText: {
      marginLeft: 12,
      flex: 1,
      fontSize: 12,
      color: theme.colors.onSurface,
    },
    fullContent: {
      fontSize: 14,
      color: theme.colors.onBackground,
      lineHeight: 20,
      marginBottom: 16,
    },
    placeholderText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      marginBottom: 16,
    },
    editSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginTop: 16,
      marginBottom: 8,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    tagChip: {
      backgroundColor: theme.colors.primaryContainer,
    },
    tagChipText: {
      color: theme.colors.onPrimaryContainer,
    },
    moodEmoji: {
      fontSize: 24,
      marginBottom: 12,
    },
    text: {
      fontSize: 14,
      color: theme.colors.onBackground,
    },
  });

export default EntryDetailsSheet;
