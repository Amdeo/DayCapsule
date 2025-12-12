import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, FlatList, AppState } from 'react-native'; // Added AppState
import { useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

import FloatingInputDock from '../../../ui/components/FloatingInputDock/FloatingInputDock';
import EntryDetailsSheet from '../../../ui/components/EntryDetailsSheet/EntryDetailsSheet';
import CameraBottomSheet from '../../capture/components/CameraBottomSheet';
import VoiceRecordingOverlay from '../../voice/components/VoiceRecordingOverlay';
import TranscriptionProgressIndicator from '../../voice/components/TranscriptionProgressIndicator';
import TimelineEntryCard from '../components/TimelineEntryCard';
import SearchOverlay from '../../search/components/SearchOverlay'; // Import SearchOverlay
import { cameraService } from '../../../services/camera/cameraService';
import { locationService } from '../../../services/location/locationService';
import { permissionsService } from '../../../services/permissions';
import { audioRecorder } from '../../../services/voice/audioRecorder';
import { useTranscription } from '../../voice/hooks/useTranscription';
import type { LifelogEntry } from '@services/storage/database';

// Use LifelogEntry directly instead of a separate Entry interface
type Entry = LifelogEntry;

// Initial Mock Data for Timeline
const INITIAL_MOCK_ENTRIES: Entry[] = [
  {
    id: '1',
    type: 'text',
    content: '今天学到了很多新知识，感觉非常充实！',
    timestamp: Date.now() - 3600 * 1000 * 24 * 3, // 3 days ago
    location: { address: '我家书房' },
    mood: '😊',
    tags: ['学习', '成长'],
  },
  {
    id: '2',
    type: 'photo',
    content: '和朋友们一起去了公园，拍了很多漂亮的照片。',
    timestamp: Date.now() - 3600 * 1000 * 24 * 1, // 1 day ago
    media: [{ uri: 'https://picsum.photos/id/1/200/300' }], // Mock photo
    location: { address: '城市公园' },
    mood: '🤩',
    tags: ['朋友', '出游', '美景'],
    thumbnailPath: 'https://picsum.photos/id/1/200/200',
  },
  {
    id: '3',
    type: 'voice',
    content: '记录了一段关于新项目想法的语音备忘录。',
    timestamp: Date.now() - 3600 * 1000 * 24 * 0.5, // 12 hours ago
    media: '/mock/audio/path.m4a', // Mock audio path
    location: { address: '办公室' },
    mood: '💡',
    tags: ['工作', '灵感', '备忘'],
    thumbnailPath: 'https://via.placeholder.com/200x200.png?text=Voice', // Placeholder thumbnail
  },
];

const TimelineScreen: React.FC = () => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [entries, setEntries] = useState<Entry[]>(INITIAL_MOCK_ENTRIES);
  const [isEntryDetailsSheetOpen, setIsEntryDetailsSheetOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | undefined>(undefined);
  const [isCameraSheetOpen, setIsCameraSheetOpen] = useState(false);
  const [isSearchOverlayVisible, setIsSearchOverlayVisible] = useState(false);
  const [currentSearchResults, setCurrentSearchResults] = useState<Entry[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSnackbarVisible, setIsSnackbarVisible] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioPath, setRecordedAudioPath] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const { transcribing, transcriptionResult, error: transcriptionError, transcribeAudio } = useTranscription(null, { // audioPath is now passed via transcribeAudio manually
    onTranscriptionComplete: (result) => {
      // Logic to add voice entry (already handled in useEffect for transcriptionResult)
    },
    onTranscriptionError: (err) => {
      setError(err);
      setIsSnackbarVisible(true);
    }
  });


  const handleMicPressOut = async () => {
    if (isRecording) {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      const path = await audioRecorder.stopRecording();
      const lastRecordingDuration = audioRecorder.getLastRecordingDuration(); // Get duration
      setIsRecording(false);

      if (path) {
        setRecordedAudioPath(path);
        transcribeAudio(path, lastRecordingDuration); // Manually trigger transcription with duration
      } else {
        // Recording cancelled or too short
      }
    }
  };

  const handleFilterPress = () => {
    setIsSearchOverlayVisible(true);
  };

  // Handle AppState changes for recording interruption
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (isRecording && nextAppState === 'background') {
        await handleMicPressOut(); // Stop recording
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isRecording, handleMicPressOut]); // Added handleMicPressOut to dependency array

  useEffect(() => {
    if (transcriptionResult && recordedAudioPath) {
      const location = null;
      const newVoiceEntry: Entry = {
        id: `voice-${Date.now()}`,
        type: 'voice',
        content: transcriptionResult.text,
        timestamp: Date.now(),
        media: recordedAudioPath,
        location,
        mood: '平淡',
        tags: ['语音'],
        // duration: recordingDuration,
      };
      setEntries(prevEntries => [newVoiceEntry, ...prevEntries]);
      setRecordedAudioPath(null);
    }
  }, [transcriptionResult, recordedAudioPath]);

  const handleOpenEntryDetails = (entry: Entry) => {
    setSelectedEntry(entry);
    setIsEntryDetailsSheetOpen(true);
  };

  const handleCloseEntryDetails = () => {
    setIsEntryDetailsSheetOpen(false);
    setSelectedEntry(undefined);
  };

  const handleTextInputFocus = () => {
    // Text input focused
  };

  const handleCameraPress = () => {
    setIsCameraSheetOpen(true);
  };

  const handleCloseCameraSheet = () => {
    setIsCameraSheetOpen(false);
  };

  const getLocation = async () => {
    try {
      const hasPermission = await permissionsService.ensurePermission('location');
      if (hasPermission) {
        return await locationService.getCurrentLocationWithAddress();
      } else {
        console.warn("Location permission denied");
        return null;
      }
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  };

  const handleCapture = async (photo: any, tags: string[] = []) => { // Modified signature
    setIsLoading(true);
    try {
      setIsCameraSheetOpen(false);

      const location = await getLocation();
      const newPhotoEntry: Entry = {
        id: `photo-${Date.now()}`,
        type: 'photo',
        content: '',
        timestamp: Date.now(),
        media: photo,
        location,
        mood: '🤩',
        tags: tags, // Use the passed tags
        thumbnailPath: photo.path || photo.uri,
      };
      setEntries(prevEntries => [newPhotoEntry, ...prevEntries]);
    } catch (e) {
      setError("Failed to save photo");
      setIsSnackbarVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromGallery = async () => {
    setIsLoading(true);
    try {
      const photos = await cameraService.pickMultiplePhotos(9);
      if (photos && photos.length > 0) {
        setIsCameraSheetOpen(false);

        const location = await getLocation();
        const newGalleryEntry: Entry = {
          id: `gallery-${Date.now()}`,
          type: 'photo',
          content: '',
          timestamp: Date.now(),
          media: photos,
          location,
          mood: '🤩',
          tags: [], // No AI tags for gallery for now
          thumbnailPath: photos[0].uri,
        };
        setEntries(prevEntries => [newGalleryEntry, ...prevEntries]);
      } else {
        // No photos selected
      }
    } catch (e) {
      setError("Gallery selection failed");
      setIsSnackbarVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Recording Handlers
  const handleMicLongPress = async () => {
    const hasPermission = await permissionsService.ensurePermission('microphone');
    if (!hasPermission) {
      setError("Microphone permission denied");
      setIsSnackbarVisible(true);
      return;
    }

    setIsRecording(true);
    setRecordingDuration(0);

    const started = await audioRecorder.startRecording();
    if (started) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setIsRecording(false);
      setError("Failed to start recording");
      setIsSnackbarVisible(true);
    }
  };

  // Handle AppState changes for recording interruption
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (isRecording && nextAppState === 'background') {
        await handleMicPressOut(); // Stop recording
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isRecording, handleMicPressOut]); // Added handleMicPressOut to dependency array



  const handleCloseSearchOverlay = () => {
    setIsSearchOverlayVisible(false);
    setCurrentSearchResults([]);
  };

  const handleSearch = (query: string, filters?: any) => {
    const filteredResults = entries.filter(entry =>
      entry.content.includes(query) || (entry.tags && entry.tags.some(tag => tag.includes(query)))
    );
    setCurrentSearchResults(filteredResults);
  };

  const handleSendText = async (text: string) => {
    setIsLoading(true);
    try {
      const location = await getLocation();
      const newTextEntry: Entry = {
        id: `text-${Date.now()}`,
        type: 'text',
        content: text,
        timestamp: Date.now(),
        location,
        mood: '平淡',
        tags: ['文本'],
      };
      setEntries(prevEntries => [newTextEntry, ...prevEntries]);
    } catch (e) {
      setError("Failed to save text");
      setIsSnackbarVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEntry = (updatedEntry: Entry) => {
    setEntries(prevEntries => 
      prevEntries.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
    );
    setSelectedEntry(updatedEntry);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
    setSelectedEntry(undefined);
    setIsEntryDetailsSheetOpen(false);
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {(isLoading || transcribing) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Memory Capsule</Text>
          <Text style={styles.headerSubtitle}>记录美好生活时光</Text>
        </View>

        {/* Timeline */}
        <FlatList
          data={currentSearchResults.length > 0 ? currentSearchResults : entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TimelineEntryCard entry={item} onPress={handleOpenEntryDetails} isLast={index === entries.length - 1} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <Text style={styles.emptyEmoji}>🌟</Text>
              <Text style={styles.emptyTitle}>开始您的记录之旅</Text>
              <Text style={styles.emptySubtitle}>点击下方按钮记录第一个美好瞬间</Text>
            </View>
          }
          style={styles.timelineList}
          contentContainerStyle={styles.timelineListContent}
          showsVerticalScrollIndicator={false}
        />

        <FloatingInputDock
          onTextInputFocus={handleTextInputFocus}
          onCameraPress={handleCameraPress}
          onMicLongPress={handleMicLongPress}
          onCameraPressOut={handleMicPressOut}
          onFilterPress={handleFilterPress}
          onSendText={handleSendText}
        />

        <EntryDetailsSheet
          isOpen={isEntryDetailsSheetOpen}
          onClose={handleCloseEntryDetails}
          selectedEntry={selectedEntry}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />

        <CameraBottomSheet
          isOpen={isCameraSheetOpen}
          onClose={handleCloseCameraSheet}
          onCapture={handleCapture}
          onSelectFromGallery={handleSelectFromGallery}
        />

        <VoiceRecordingOverlay
          isVisible={isRecording}
          durationSeconds={recordingDuration}
        />

        <TranscriptionProgressIndicator
          isVisible={transcribing}
          message={transcriptionResult ? "转写完成！" : "正在转写语音..."}
        />

        <Snackbar
          visible={isSnackbarVisible || !!transcriptionError || !!error}
          onDismiss={() => { setIsSnackbarVisible(false); setError(null); }}
          action={{
            label: 'OK',
            onPress: () => { setIsSnackbarVisible(false); setError(null); },
          }}
        >
          <Text>{error || transcriptionError}</Text>
        </Snackbar>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  timelineList: {
    flex: 1,
    width: '100%',
  },
  timelineListContent: {
    paddingTop: 24,
    paddingBottom: 100,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.onBackground,
    marginBottom: 20,
  },
  text: {
    fontSize: 14,
    color: theme.colors.onBackground,
    marginBottom: 5,
  },
});

export default TimelineScreen;