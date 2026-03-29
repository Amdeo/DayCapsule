/**
 * 增强的 Entry 卡片组件 - 极简现代风格
 * 支持文本、照片和语音等多种媒体类型
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Entry } from '@/src/types/entry';
import { useEntryStore } from '@/src/store/entryStore';
import { CalendarDensity, PHOTO_HEIGHT_VALUES, useSettingsStore } from '@/src/store/settingsStore';
import { EntryCardCalendarContent } from './entry-card/EntryCardCalendarContent';
import { EntryCardDialogs } from './entry-card/EntryCardDialogs';
import { EntryCardDefaultContent } from './entry-card/EntryCardDefaultContent';
import { entryCardStyles as styles } from './entry-card/EntryCard.styles';
import {
  getEntryCardBackgroundColor,
  getEntryCardCalendarBorderColor,
  getEntryCardPhotoImageRadius,
  getEntryCardPressedBackgroundColor,
  getEntryCardResolvedPhotoHeight,
  getEntryCardSyncStatusMeta,
} from './entry-card/entryCardAppearance';
import { useEntryCardAudio } from './entry-card/useEntryCardAudio';
import { useEntryCardController } from './entry-card/useEntryCardController';

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onView?: (entry: Entry) => void;
  onEdit?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  cardSpacing?: number;
  enterDelay?: number;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (entryId: string) => void;
  variant?: 'default' | 'calendar';
  calendarDensity?: CalendarDensity;
}

function EntryCard({
  entry,
  onDelete,
  onView,
  onEdit,
  onStopRecording,
  cardSpacing = 12,
  enterDelay = 0,
  isActionSheetActive,
  onActionSheetOpen,
  variant = 'default',
  calendarDensity = 'default',
}: EntryCardProps) {
  const { currentPlayingId, setCurrentPlayingId } = useEntryStore();
  const photoHeight = useSettingsStore((s) => s.photoHeight);
  const maxPhotoHeight = PHOTO_HEIGHT_VALUES[photoHeight];
  const resolvedPhotoHeight = getEntryCardResolvedPhotoHeight(
    maxPhotoHeight,
    variant,
    calendarDensity,
  );

  const {
    audioMissing,
    isPlayingAudio,
    playbackPosition,
    handlePlayAudio,
    handleStopAudio,
  } = useEntryCardAudio({
    entry,
    currentPlayingId,
    setCurrentPlayingId,
  });

  const {
    swipeableRef,
    isExpanded,
    isPressed,
    isProcessing,
    showImageViewer,
    selectedImageIndex,
    showActionSheet,
    needsExpansion,
    setIsPressed,
    handleLongPress,
    handleSwipeTrigger,
    handleImagePress,
    handleCardPress,
    runStopRecording,
    handleActionSheetEdit,
    handleActionSheetDelete,
    closeActionSheetAndResetCard,
    closeImageViewer,
  } = useEntryCardController({
    entry,
    onDelete,
    onView,
    onEdit,
    onStopRecording,
    isActionSheetActive,
    onActionSheetOpen,
    isPlayingAudio,
    onPlayAudio: handlePlayAudio,
  });

  const photoImageRadius = getEntryCardPhotoImageRadius(entry);
  const isLocalReadyProcessing = entry.localReadyState === 'processing';
  const syncStatusMeta = isLocalReadyProcessing
    ? { iconName: null, iconColor: '#A3A3A3', text: null }
    : getEntryCardSyncStatusMeta(entry);

  const renderRightActions = () => <View style={{ width: 96 }} />;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={1.2}
      leftThreshold={40}
      rightThreshold={24}
      overshootRight={false}
      dragOffsetFromRightEdge={10}
      onSwipeableWillOpen={(direction) => handleSwipeTrigger('willOpen', direction)}
      onSwipeableOpen={(direction) => handleSwipeTrigger('open', direction)}
    >
      <>
        <Animated.View
          testID="entry-card-container"
          entering={FadeInRight.duration(360).delay(enterDelay)}
          layout={Layout.springify()}
          style={[
            styles.cardShadow,
            variant === 'calendar' && styles.calendarCardShadow,
            { marginBottom: cardSpacing },
          ]}
        >
          <View
            testID={variant === 'calendar' ? `calendar-card-shell-${entry.id}` : undefined}
            style={variant === 'calendar' ? styles.calendarCardShell : undefined}
          >
            <Pressable
              testID="entry-card"
              onPressIn={() => setIsPressed(true)}
              onPressOut={() => setIsPressed(false)}
              onPress={handleCardPress}
              onLongPress={handleLongPress}
              style={[
                styles.cardContainer,
                variant === 'calendar' && styles.calendarCardContainer,
                variant === 'calendar' && {
                  borderColor: getEntryCardCalendarBorderColor(entry.type),
                  borderWidth: 1,
                },
                {
                  backgroundColor: isPressed
                    ? getEntryCardPressedBackgroundColor(entry.type, variant)
                    : getEntryCardBackgroundColor(entry.type, variant),
                },
              ]}
            >
              <View>
                <View
                  style={[
                    entry.type === 'voice' ? styles.contentVoice : styles.content,
                    entry.type === 'text' && styles.contentText,
                    entry.type === 'photo' && styles.contentPhoto,
                    variant === 'calendar' && styles.calendarContent,
                  ]}
                >
                  {variant === 'calendar' ? (
                    <EntryCardCalendarContent
                      entry={entry}
                      isExpanded={isExpanded}
                      resolvedPhotoHeight={resolvedPhotoHeight}
                      calendarDensity={calendarDensity}
                      audioMissing={audioMissing}
                      isPlayingAudio={isPlayingAudio}
                      playbackPosition={playbackPosition}
                      isProcessing={isProcessing}
                      isLocalReadyProcessing={isLocalReadyProcessing}
                      onCardPress={handleCardPress}
                      onImagePress={handleImagePress}
                      onPlayAudio={handlePlayAudio}
                      onStopAudio={handleStopAudio}
                      onRunStopRecording={runStopRecording}
                    />
                  ) : (
                    <EntryCardDefaultContent
                      entry={entry}
                      isExpanded={isExpanded}
                      resolvedPhotoHeight={resolvedPhotoHeight}
                      photoImageRadius={photoImageRadius}
                      syncStatusMeta={syncStatusMeta}
                      audioMissing={audioMissing}
                      isPlayingAudio={isPlayingAudio}
                      playbackPosition={playbackPosition}
                      isProcessing={isProcessing}
                      isLocalReadyProcessing={isLocalReadyProcessing}
                      onImagePress={handleImagePress}
                      onPlayAudio={handlePlayAudio}
                      onStopAudio={handleStopAudio}
                      onRunStopRecording={runStopRecording}
                    />
                  )}
                </View>

                {needsExpansion && !isExpanded && variant !== 'calendar' ? (
                  <Text style={styles.expandHint}>点击展开更多</Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        </Animated.View>

        <EntryCardDialogs
          entry={entry}
          selectedImageIndex={selectedImageIndex}
          showImageViewer={showImageViewer}
          showActionSheet={showActionSheet}
          onCloseImageViewer={closeImageViewer}
          onEdit={handleActionSheetEdit}
          onDelete={handleActionSheetDelete}
          onCloseActionSheet={closeActionSheetAndResetCard}
        />
      </>
    </Swipeable>
  );
}

const MemoizedEntryCard = React.memo(EntryCard);
export { MemoizedEntryCard as EntryCard };
