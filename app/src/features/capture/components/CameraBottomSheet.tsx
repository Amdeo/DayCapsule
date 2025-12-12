import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'; // Added Image
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme, IconButton, Button } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import { Camera, useCameraDevice, useCameraPermission, PhotoFile } from 'react-native-vision-camera';

import { useAITags } from '../hooks/useAITags'; // Import useAITags
import { AITagSuggestions } from './AITagSuggestions'; // Import AITagSuggestions

interface CameraBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: PhotoFile, tags: string[]) => void; // Modified to pass tags
  onSelectFromGallery: () => void;
}

const CameraBottomSheet: React.FC<CameraBottomSheetProps> = ({
  isOpen,
  onClose,
  onCapture,
  onSelectFromGallery,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const cameraRef = useRef<Camera>(null);
  const theme = useTheme();
  const styles = getStyles(theme);
  
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoFile | null>(null); // State to hold captured photo temporarily

  const {
    suggestedTags,
    isLoading: isGeneratingTags,
    error: aiTagsError,
    generateTags,
    toggleTag,
    selectAllTags,
    deselectAllTags,
    getSelectedTags,
    clearSuggestions,
  } = useAITags(); // Initialize useAITags hook

  // Snap points: 60% for viewfinder, and adjust if tags are shown
  const snapPoints = useMemo(() => {
    if (capturedPhoto && suggestedTags.length > 0) {
      return ['60%', '90%']; // Allow more space for tags
    }
    return ['60%'];
  }, [capturedPhoto, suggestedTags.length]);

  useEffect(() => {
    if (isOpen) {
      setIsActive(true);
      if (!hasPermission) {
        requestPermission();
      }
    } else {
      setIsActive(false);
      setCapturedPhoto(null); // Clear captured photo when sheet closes
      clearSuggestions(); // Clear AI tag suggestions
    }
  }, [isOpen, hasPermission, requestPermission, clearSuggestions]);

  useEffect(() => {
    // Automatically generate tags if a photo is captured
    if (capturedPhoto && !isGeneratingTags && !aiTagsError && suggestedTags.length === 0) {
      generateTags(capturedPhoto.path);
    }
  }, [capturedPhoto, isGeneratingTags, aiTagsError, suggestedTags.length, generateTags]);

  const handleTakePhoto = useCallback(async () => {
    if (cameraRef.current && isActive) {
      try {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: true,
        });
        setCapturedPhoto(photo); // Store photo locally to trigger tag generation
        // Do not call onCapture here yet, wait for tags or user confirmation
      } catch (e) {
        console.error('Failed to take photo:', e);
      }
    }
  }, [isActive]);

  const handleConfirmCapture = useCallback(() => {
    if (capturedPhoto) {
      const selectedTags = getSelectedTags();
      onCapture(capturedPhoto, selectedTags); // Pass photo and selected tags
      onClose(); // Close the sheet after confirming
    }
  }, [capturedPhoto, getSelectedTags, onCapture, onClose]);

  const handleRetakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    clearSuggestions();
  }, [clearSuggestions]);


  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer} testID="camera-bottom-sheet-view">
        <View style={styles.previewContainer}>
          {hasPermission && device && isActive ? (
            capturedPhoto ? (
              // Display captured photo
              <Image source={{ uri: `file://${capturedPhoto.path}` }} style={StyleSheet.absoluteFill} />
            ) : (
              // Display live camera preview
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                photo={true}
              />
            )
          ) : (
            <>
              <Text style={styles.previewText}>
                {!device ? '未找到相机设备' : !hasPermission ? '需要相机权限' : '相机未激活'}
              </Text>
              <IconButton icon="camera-off" size={48} color={theme.colors.onSurfaceVariant} />
            </>
          )}
        </View>

        {capturedPhoto && (
          <AITagSuggestions
            tags={suggestedTags}
            isLoading={isGeneratingTags}
            error={aiTagsError}
            onTagToggle={toggleTag}
            onSelectAll={selectAllTags}
            onDeselectAll={deselectAllTags}
            testID="ai-tag-suggestions"
          />
        )}


        <View style={styles.controlsContainer}>
          {capturedPhoto ? (
            <>
              <Button mode="outlined" onPress={handleRetakePhoto} style={styles.controlButton}><Text>重拍</Text></Button>
              <Button mode="contained" onPress={handleConfirmCapture} style={styles.controlButton}><Text>确认 ({getSelectedTags().length} 标签)</Text></Button>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={onSelectFromGallery} style={styles.galleryButton}>
                 <IconButton icon="image" size={32} color={theme.colors.onSurface} />
                 <Text style={styles.buttonLabel}>相册</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleTakePhoto} style={styles.captureButton} testID="take-photo-button">
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {}} style={styles.flipButton}>
                 <IconButton icon="camera-flip" size={32} color={theme.colors.onSurface} />
                 <Text style={styles.buttonLabel}>翻转</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
  },
  handleIndicator: {
    backgroundColor: theme.colors.onSurfaceVariant,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black', // Black background for camera preview
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden', // Clip camera view to border radius
  },
  previewText: {
    color: 'white',
    marginBottom: 10,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
  },
  galleryButton: {
    alignItems: 'center',
  },
  flipButton: {
    alignItems: 'center',
  },
  buttonLabel: {
    color: theme.colors.onSurface,
    fontSize: 12,
  },
  controlButton: { // Style for confirm/retake buttons
    flex: 1,
    marginHorizontal: 5,
  }
});

export default CameraBottomSheet;
