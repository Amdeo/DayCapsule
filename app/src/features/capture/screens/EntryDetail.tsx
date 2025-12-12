import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Image, Alert} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Chip,
  useTheme,
  IconButton,
  Dialog,
  Portal,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch} from 'react-redux';
import type {LifelogEntry} from '@services/storage/database';
import {databaseService} from '@services/storage/database';
import {fileSystemService} from '@services/storage/fileSystem';
import TagInput from '../components/TagInput';
import {MoodSelector, Mood} from '../components/MoodSelector';
import {TranscriptionEditor} from '../components/TranscriptionEditor';
import {TranscriptionProgress} from '../components/TranscriptionProgress';
import {useTranscription} from '@hooks/useTranscription';
import type {AppDispatch} from '@store';

interface EntryDetailProps {
  entry: LifelogEntry;
  onClose: () => void;
  onUpdate?: (entry: LifelogEntry) => void;
  onDelete?: () => void;
}

export const EntryDetail: React.FC<EntryDetailProps> = ({entry, onClose, onUpdate, onDelete}) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const {transcribe, isTranscribing, progress} = useTranscription();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(entry.content);
  const [editedTags, setEditedTags] = useState(entry.tags);
  const [editedMood, setEditedMood] = useState<Mood>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTranscriptionEditor, setShowTranscriptionEditor] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState(entry.content);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedEntry: LifelogEntry = {
        ...entry,
        content: editedContent,
        tags: editedTags,
        updatedAt: Date.now(),
      };

      await databaseService.updateEntry(updatedEntry);
      setIsEditing(false);
      onUpdate?.(updatedEntry);
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      // 删除媒体文件
      if (entry.mediaPath) {
        await fileSystemService.deleteFile(entry.mediaPath);
      }
      if (entry.thumbnailPath) {
        await fileSystemService.deleteFile(entry.thumbnailPath);
      }

      // 删除数据库记录
      await databaseService.deleteEntry(entry.id);
      onDelete?.();
      onClose();
    } catch (error) {
      Alert.alert('错误', '删除失败，请重试');
    }
  };

  const handleRetranscribe = async () => {
    if (entry.type !== 'voice' || !entry.mediaPath) {
      Alert.alert('错误', '只能对语音记录进行转录');
      return;
    }

    try {
      const result = await transcribe(entry.mediaPath);
      if (result) {
        setTranscriptionText(result.text);
        setEditedContent(result.text);
      }
    } catch (error) {
      Alert.alert('错误', '转录失败，请重试');
    }
  };

  const handleSaveTranscription = async (newText: string) => {
    setIsSaving(true);
    try {
      const updatedEntry: LifelogEntry = {
        ...entry,
        content: newText,
        tags: editedTags,
        updatedAt: Date.now(),
      };

      await databaseService.updateEntry(updatedEntry);
      setTranscriptionText(newText);
      setEditedContent(newText);
      setShowTranscriptionEditor(false);
      onUpdate?.(updatedEntry);
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'photo':
        return 'image';
      case 'voice':
        return 'microphone';
      case 'text':
        return 'text';
      default:
        return 'file';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'photo':
        return '照片记录';
      case 'voice':
        return '语音记录';
      case 'text':
        return '文字记录';
      default:
        return '记录';
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      testID="entry-detail-screen">
      {/* 头部 */}
      <View style={[styles.header, {borderBottomColor: theme.colors.outlineVariant}]}>
        <View style={styles.headerLeft}>
          <Icon name={getTypeIcon(entry.type)} size={24} color={theme.colors.primary} />
          <View style={styles.headerInfo}>
            <Text variant="titleMedium">{getTypeLabel(entry.type)}</Text>
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
              {formatDate(entry.timestamp)}
            </Text>
          </View>
        </View>
        <IconButton icon="close" size={24} onPress={onClose} testID="back-button" />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 照片预览 */}
        {entry.type === 'photo' && entry.mediaPath && (
          <Image
            source={{uri: entry.mediaPath}}
            style={styles.photo}
            resizeMode="cover"
            testID="detail-photo"
          />
        )}

        {/* 语音指示器 */}
        {entry.type === 'voice' && (
          <View style={[styles.voiceIndicator, {backgroundColor: theme.colors.primaryContainer}]}>
            <Icon name="microphone" size={32} color={theme.colors.onPrimaryContainer} />
            <Text
              variant="headlineSmall"
              style={[styles.voiceDuration, {color: theme.colors.onPrimaryContainer}]}>
              {formatVoiceDuration(entry.voiceDuration || 0)}
            </Text>
          </View>
        )}

        {/* 转录进度显示 */}
        {entry.type === 'voice' && (
          <>
            <TranscriptionProgress
              isVisible={isTranscribing}
              progress={progress}
              status={isTranscribing ? 'transcribing' : 'completed'}
              message="正在转录语音..."
              testID="transcription-progress"
            />

            {/* 重新转录按钮 */}
            <Button
              mode="outlined"
              icon="refresh"
              onPress={handleRetranscribe}
              disabled={isTranscribing}
              style={styles.retranscribeButton}
              testID="retranscribe-button">
              <Text>重新转录</Text>
            </Button>
          </>
        )}

        {/* 内容 */}
        {isEditing ? (
          <TextInput
            mode="outlined"
            label="编辑内容"
            value={editedContent}
            onChangeText={setEditedContent}
            multiline
            numberOfLines={6}
            style={styles.editInput}
            testID="edit-mode"
          />
        ) : (
          entry.content && (
            <View style={styles.contentSection} testID="entry-content">
              <View style={styles.contentHeader}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  内容
                </Text>
                {entry.type === 'voice' && (
                  <Button
                    mode="text"
                    icon="pencil"
                    onPress={() => setShowTranscriptionEditor(true)}
                    compact
                    testID="edit-transcription-button">
                    <Text>编辑</Text>
                  </Button>
                )}
              </View>
              <Text variant="bodyMedium" style={styles.contentText}>
                {entry.content}
              </Text>
            </View>
          )
        )}

        {/* 标签 */}
        {isEditing ? (
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              标签
            </Text>
            <TagInput tags={editedTags} onTagsChange={setEditedTags} />
          </View>
        ) : entry.tags && entry.tags.length > 0 ? (
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              标签
            </Text>
            <View style={styles.tagsContainer}>
              {entry.tags.map(tag => (
                <Chip key={tag} mode="flat" style={styles.tag}>
                  <Text>{tag}</Text>
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        {/* 位置 */}
        {entry.location && (
          <View style={styles.section}>
            <View style={styles.metaHeader}>
              <Icon name="map-marker" size={20} color={theme.colors.primary} />
              <Text variant="titleSmall" style={styles.sectionTitle}>
                位置
              </Text>
            </View>
            <Text variant="bodyMedium">{entry.location.address || '未知位置'}</Text>
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
              {entry.location.latitude}, {entry.location.longitude}
            </Text>
          </View>
        )}

        {/* 天气 */}
        {entry.weather && (
          <View style={styles.section}>
            <View style={styles.metaHeader}>
              <Icon name="weather-cloudy" size={20} color={theme.colors.primary} />
              <Text variant="titleSmall" style={styles.sectionTitle}>
                天气
              </Text>
            </View>
            <Text variant="bodyMedium">
              {entry.weather.condition} {entry.weather.temperature}°C
            </Text>
          </View>
        )}

        {/* 元数据 */}
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            信息
          </Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                创建时间
              </Text>
              <Text variant="bodyMedium">{formatDate(entry.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                修改时间
              </Text>
              <Text variant="bodyMedium">{formatDate(entry.updatedAt)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 底部操作按钮 */}
      <View style={[styles.footer, {borderTopColor: theme.colors.outlineVariant}]}>
        {isEditing ? (
          <>
            <Button mode="outlined" onPress={() => setIsEditing(false)} style={styles.button}><Text>取消</Text></Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.button}
              testID="save-button"><Text>保存</Text></Button>
          </>
        ) : (
          <>
            <Button
              mode="outlined"
              icon="pencil"
              onPress={() => setIsEditing(true)}
              style={styles.button}
              testID="edit-button"><Text>编辑</Text></Button>
            <Button
              mode="contained"
              icon="delete"
              buttonColor={theme.colors.error}
              onPress={() => setShowDeleteDialog(true)}
              style={styles.button}
              testID="delete-button"><Text>删除</Text></Button>
          </>
        )}
      </View>

      {/* 删除确认对话框 */}
      <Portal>
        <Dialog
          visible={showDeleteDialog}
          onDismiss={() => setShowDeleteDialog(false)}
          testID="delete-confirm-dialog">
          <Dialog.Title>确认删除</Dialog.Title>
          <Dialog.Content>
            <Text>确定要删除这条记录吗？此操作无法撤销。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}><Text>取消</Text></Button>
            <Button
              mode="text"
              textColor={theme.colors.error}
              onPress={handleDelete}
              testID="confirm-delete-button"><Text>删除</Text></Button>
          </Dialog.Actions>
        </Dialog>

        {/* 转录编辑器 */}
        <TranscriptionEditor
          visible={showTranscriptionEditor}
          initialText={transcriptionText}
          onSave={handleSaveTranscription}
          onCancel={() => setShowTranscriptionEditor(false)}
          testID="transcription-editor-dialog"
        />
      </Portal>
    </View>
  );
};

function formatVoiceDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  voiceDuration: {
    marginLeft: 12,
    fontWeight: '600',
  },
  contentSection: {
    marginBottom: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editInput: {
    marginBottom: 16,
  },
  contentText: {
    lineHeight: 24,
  },
  retranscribeButton: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    height: 32,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
  },
});
