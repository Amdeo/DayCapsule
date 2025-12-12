import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Image, KeyboardAvoidingView, Platform} from 'react-native';
import {Text, Button, TextInput, Portal, Dialog, IconButton} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {cameraService} from '@services/camera';
import {tagSuggestionService} from '@services/ai/tagSuggestion';
import {createPhotoEntry, createTextEntry, createVoiceEntry} from '@store/slices/captureSlice';
import TagInput from '../components/TagInput';
import {MoodSelector, Mood} from '../components/MoodSelector';
import {VoiceRecorder} from '../components/VoiceRecorder';
import {EntryList} from '../components/EntryList';
import {TranscriptionLanguageSelector} from '../components/TranscriptionLanguageSelector';
import {TranscriptionProgress} from '../components/TranscriptionProgress';
import {LoadingIndicator, EmptyState} from '@ui';
import {useTranscription} from '@hooks/useTranscription';
import EntryDetailsSheet from '@ui/components/EntryDetailsSheet/EntryDetailsSheet';
import type {AppDispatch, RootState} from '@store';
import type {LifelogEntry} from '@services/storage/database';

export const HomeScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {loading, recentEntries} = useSelector((state: RootState) => state.capture);
  const {transcribe, isTranscribing, progress} = useTranscription();

  const [showCaptureDialog, setShowCaptureDialog] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'text' | 'voice'>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState<Mood>(null);
  const [showEntryList, setShowEntryList] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('zh-CN');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LifelogEntry | undefined>(undefined);
  const [showEntryDetails, setShowEntryDetails] = useState(false);

  // 添加测试数据，确保有记录可以显示
  const testEntries: LifelogEntry[] = [
    {
      id: '1',
      type: 'text',
      content: '今天天气很好，阳光明媚的心情记录。',
      timestamp: Date.now() - 3600000,
      tags: ['心情', '天气'],
      mood: '😊',
      location: {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区'
      },
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: '2',
      type: 'photo',
      content: '今天的美食照片，看起来很诱人！',
      timestamp: Date.now() - 7200000,
      tags: ['美食', '照片'],
      mediaPath: 'https://picsum.photos/300/200',
      location: {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区'
      },
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 7200000,
    },
  ];

  const displayEntries = recentEntries.length > 0 ? recentEntries : testEntries;

  // 初始化标签建议
  useEffect(() => {
    const loadTagSuggestions = async () => {
      try {
        const suggestions = await tagSuggestionService.getAllHistoricalTags();
        setTagSuggestions(suggestions.slice(0, 10));
      } catch (error) {
        console.log('Tag suggestions not available yet:', error);
        setTagSuggestions([]);
      }
    };
    loadTagSuggestions();
  }, []);

  // 当内容改变时更新标签建议
  const updateTagSuggestions = async (newContent: string) => {
    try {
      const suggestions = await tagSuggestionService.getSuggestions(newContent, 5);
      setTagSuggestions(suggestions);
    } catch (error) {
      console.log('Tag suggestions not available yet:', error);
    }
  };

  const handleTakePhoto = async () => {
    const photo = await cameraService.takePhoto();
    if (photo) {
      setPhotoUri(photo.uri);
      setCaptureMode('photo');
      setShowCaptureDialog(true);
    }
  };

  const handlePickFromGallery = async () => {
    const photo = await cameraService.pickFromGallery();
    if (photo) {
      setPhotoUri(photo.uri);
      setCaptureMode('photo');
      setShowCaptureDialog(true);
    }
  };

  const handleTextCapture = () => {
    setCaptureMode('text');
    setPhotoUri(null);
    setVoiceUri(null);
    setShowCaptureDialog(true);
  };

  const handleVoiceCapture = () => {
    setCaptureMode('voice');
    setPhotoUri(null);
    setVoiceUri(null);
    setShowCaptureDialog(true);
  };

  const handleVoiceRecordingComplete = async (uri: string, duration: number) => {
    setVoiceUri(uri);
    setVoiceDuration(duration);

    // 自动触发转录
    try {
      const result = await transcribe(uri);
      if (result) {
        setContent(result.text);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    }
  };

  const handleSave = async () => {
    if (captureMode === 'photo' && photoUri) {
      await dispatch(createPhotoEntry({photoPath: photoUri, content, tags}));
    } else if (captureMode === 'text' && content.trim()) {
      await dispatch(createTextEntry({content, tags}));
    } else if (captureMode === 'voice' && voiceUri) {
      await dispatch(
        createVoiceEntry({
          voicePath: voiceUri,
          duration: voiceDuration,
          content,
          tags,
          transcriptionLanguage: selectedLanguage,
          transcriptionConfidence: progress === 1 ? 0.95 : undefined,
        }),
      );
    }

    // 重置状态
    setShowCaptureDialog(false);
    setPhotoUri(null);
    setVoiceUri(null);
    setVoiceDuration(0);
    setContent('');
    setTags([]);
    setMood(null);
  };

  const handleCancel = () => {
    setShowCaptureDialog(false);
    setPhotoUri(null);
    setVoiceUri(null);
    setVoiceDuration(0);
    setContent('');
    setTags([]);
    setMood(null);
    setShowLanguageSelector(false);
  };

  const canSave =
    (captureMode === 'photo' && photoUri) ||
    (captureMode === 'text' && content.trim().length > 0) ||
    (captureMode === 'voice' && voiceUri);

  return (
    <View style={styles.container} testID="home-screen">
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium">记忆胶囊</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            记录生活的每一个瞬间
          </Text>
        </View>

        {/* 快速操作卡片 */}
        <View style={styles.quickActions}>
          <Button mode="contained"
            onPress={handleTakePhoto}
            style={styles.actionButton}
            testID="fab-photo"><Text>📷 拍照</Text></Button>
          <Button mode="contained"
            onPress={handleVoiceCapture}
            style={styles.actionButton}
            testID="fab-voice"><Text>🎤 语音</Text></Button>
          <Button mode="contained"
            onPress={handleTextCapture}
            style={styles.actionButton}
            testID="fab-text"><Text>✍️ 文字</Text></Button>
        </View>

        {/* 查看所有记录按钮 */}
        {recentEntries.length > 0 && (
          <Button
            mode="outlined"
            onPress={() => setShowEntryList(true)}
            style={styles.viewAllButton}
            testID="view-all-button">
            <Text>查看所有记录 ({recentEntries.length})</Text>
          </Button>
        )}
      </ScrollView>

      {/* 记录列表对话框 */}
      <Portal>
        <Dialog
          visible={showEntryList}
          onDismiss={() => setShowEntryList(false)}
          style={styles.listDialog}
          testID="entry-list-dialog">
          <Dialog.Title>所有记录</Dialog.Title>
          <Dialog.ScrollArea style={styles.listScrollArea}>
            <EntryList
              entries={displayEntries}
              onEntryPress={entry => {
                console.log('HomeScreen - Entry pressed:', entry);
                console.log('HomeScreen - Setting selected entry:', entry.id);
                setSelectedEntry(entry);
                setShowEntryDetails(true);
              }}
              ListEmptyComponent={
                <EmptyState icon="inbox" title="暂无记录" message="开始记录您的生活吧" />
              }
              testID="entry-list"
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowEntryList(false)}><Text>关闭</Text></Button>
          </Dialog.Actions>
        </Dialog>

        {/* 记录对话框 */}
        <Dialog
          visible={showCaptureDialog}
          onDismiss={handleCancel}
          style={styles.dialog}
          testID={`${captureMode}-entry-dialog`}>
          <Dialog.Title>
            {captureMode === 'photo'
              ? '照片记录'
              : captureMode === 'voice'
              ? '语音记录'
              : '文字记录'}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* 语音录制 */}
                {captureMode === 'voice' && !voiceUri && (
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecordingComplete}
                    onCancel={handleCancel}
                  />
                )}

                {/* 语音录制完成提示 */}
                {captureMode === 'voice' && voiceUri && (
                  <View style={styles.voiceComplete}>
                    <Icon name="check-circle" size={48} color="#4CAF50" />
                    <Text variant="titleMedium" style={styles.voiceCompleteText}>
                      录音完成 ({Math.floor(voiceDuration / 60)}:
                      {(voiceDuration % 60).toString().padStart(2, '0')})
                    </Text>
                  </View>
                )}

                {/* 转录进度显示 */}
                {captureMode === 'voice' && voiceUri && (
                  <>
                    <TranscriptionProgress
                      isVisible={isTranscribing}
                      progress={progress}
                      status={isTranscribing ? 'transcribing' : 'completed'}
                      message="正在转录语音..."
                      testID="transcription-progress"
                    />

                    {/* 语言选择按钮 */}
                    <Button
                      mode="outlined"
                      icon="translate"
                      onPress={() => setShowLanguageSelector(true)}
                      style={styles.languageButton}
                      testID="language-select-button">
                      <Text>转录语言: 中文</Text>
                    </Button>
                  </>
                )}

                {/* 照片预览 */}
                {photoUri && (
                  <View style={styles.photoPreview} testID="photo-preview">
                    <Image source={{uri: photoUri}} style={styles.photo} resizeMode="cover" />
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => setPhotoUri(null)}
                      style={styles.removePhoto}
                    />
                  </View>
                )}

                {/* 内容输入 */}
                {captureMode !== 'voice' || voiceUri ? (
                  <>
                    <TextInput
                      mode="outlined"
                      label="描述（可选）"
                      placeholder="记录此刻的想法..."
                      value={content}
                      onChangeText={newContent => {
                        setContent(newContent);
                        updateTagSuggestions(newContent);
                      }}
                      multiline
                      numberOfLines={4}
                      style={styles.contentInput}
                      testID={captureMode === 'photo' ? 'photo-description' : 'text-input'}
                    />

                    {/* 标签输入 */}
                    <TagInput tags={tags} onTagsChange={setTags} suggestions={tagSuggestions} />

                    {/* 心情选择 */}
                    <MoodSelector selectedMood={mood} onMoodChange={setMood} />
                  </>
                ) : null}
              </KeyboardAvoidingView>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={handleCancel} testID="cancel-button"><Text>取消</Text></Button>
            <Button onPress={handleSave} disabled={!canSave || loading} testID="save-button"><Text>{loading ? '保存中...' : '保存'}</Text></Button>
          </Dialog.Actions>
        </Dialog>

        {/* 语言选择器 */}
        <TranscriptionLanguageSelector
          visible={showLanguageSelector}
          selectedLanguage={selectedLanguage}
          onLanguageSelect={language => {
            setSelectedLanguage(language);
            setShowLanguageSelector(false);
          }}
          onCancel={() => setShowLanguageSelector(false)}
          testID="language-selector-dialog"
        />
      </Portal>

      {loading && <LoadingIndicator fullScreen message="保存中..." />}

      {/* 记录详情底部表单 */}
      <EntryDetailsSheet
        selectedEntry={selectedEntry}
        isOpen={showEntryDetails}
        onClose={() => {
          setShowEntryDetails(false);
          setSelectedEntry(undefined);
        }}
        onEdit={(entry) => {
          // TODO: 实现编辑功能
          console.log('Edit entry:', entry.id);
        }}
        onDelete={(entryId) => {
          // TODO: 实现删除功能
          console.log('Delete entry:', entryId);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
  viewAllButton: {
    marginTop: 16,
  },
  listDialog: {
    maxHeight: '80%',
  },
  listScrollArea: {
    maxHeight: 400,
    paddingHorizontal: 0,
  },
  dialog: {
    maxHeight: '80%',
  },
  voiceComplete: {
    alignItems: 'center',
    padding: 24,
  },
  voiceCompleteText: {
    marginTop: 12,
  },
  photoPreview: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentInput: {
    marginBottom: 8,
  },
  languageButton: {
    marginVertical: 12,
  },
});
