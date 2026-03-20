/**
 * 增强的 Entry 卡片组件 - 极简现代风格
 * 支持文本、照片和语音等多种媒体类型
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import Animated, {
  FadeInRight,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '@/src/types/entry';
import { useEntryStore } from '@/src/store/entryStore';
import * as FileSystem from 'expo-file-system';
import { VoiceService } from '@/src/services/voiceService';
import WaveformAnimation from './WaveformAnimation';
import { logger } from '@/src/utils/logger';
import { ImageViewer } from './ImageViewer';
import { Swipeable } from 'react-native-gesture-handler';
import { useSettingsStore, PHOTO_HEIGHT_VALUES } from '@/src/store/settingsStore';
import { EntryActionSheet, ENTRY_ACTION_SHEET_EXIT_DURATION } from './EntryActionSheet';
import { PhotoGrid } from './PhotoGrid';
import { formatMMSS } from '@/src/utils/timeUtils';
import { PhotoService } from '@/src/services/photoService';
import { CalendarDensity } from '@/src/store/settingsStore';

const ACTION_SHEET_OPEN_DELAY = 100;


interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onView?: (entry: Entry) => void;
  onEdit?: (entry: Entry) => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
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
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  cardSpacing = 12,
  enterDelay = 0,
  isActionSheetActive,
  onActionSheetOpen,
  variant = 'default',
  calendarDensity = 'default',
}: EntryCardProps) {
  type CardInteractionState = 'idle' | 'pendingSheet' | 'sheetOpen' | 'closing';
  const { currentPlayingId, setCurrentPlayingId } = useEntryStore();
  const photoHeight = useSettingsStore((s) => s.photoHeight);
  const maxPhotoHeight = PHOTO_HEIGHT_VALUES[photoHeight];
  const calendarPhotoHeights: Record<CalendarDensity, number> = {
    comfortable: 260,
    default: 220,
    compact: 180,
  };
  const resolvedPhotoHeight = variant === 'calendar'
    ? Math.min(maxPhotoHeight, calendarPhotoHeights[calendarDensity])
    : maxPhotoHeight;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  // 当其他卡片开始播放时，重置本卡片状态
  useEffect(() => {
    logger.log('[EntryCard] currentPlayingId changed:', currentPlayingId, 'myId:', entry.id, 'isPlayingAudio:', isPlayingAudio);
    if (currentPlayingId !== entry.id && isPlayingAudio) {
      logger.log('[EntryCard] resetting card', entry.id);
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
    }
  }, [currentPlayingId, entry.id]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const swipeableRef = useRef<Swipeable>(null);
  const [audioMissing, setAudioMissing] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [interactionState, setInteractionState] = useState<CardInteractionState>('idle');
  const openSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTranslateX = useSharedValue(0);

  // 红点闪烁动画
  const redDotOpacity = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardTranslateX.value }],
  }));

  useEffect(() => {
    if (entry.recordingStatus === 'recording') {
      redDotOpacity.value = withRepeat(
        withTiming(0.3, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      cancelAnimation(redDotOpacity);
      redDotOpacity.value = 1;
    }

    // 组件卸载时清理动画
    return () => {
      cancelAnimation(redDotOpacity);
    };
  }, [entry.recordingStatus]);

  useEffect(() => {
    if (isActionSheetActive === false && interactionState !== 'idle' && interactionState !== 'closing') {
      logger.log('[EntryCard] inactive while non-idle, closing current interaction', entry.id, interactionState);
      closeActionSheetAndResetCard();
    }
  }, [entry.id, interactionState, isActionSheetActive]);

  useEffect(() => {
    return () => {
      if (openSheetTimeoutRef.current) {
        clearTimeout(openSheetTimeoutRef.current);
      }
      if (resetCardTimeoutRef.current) {
        clearTimeout(resetCardTimeoutRef.current);
      }
    };
  }, []);

  // 停止音频播放
  const handleStopAudio = async () => {
    try {
      await VoiceService.stopPlayback();
    } catch (error) {
      logger.error('Failed to stop audio:', error);
    } finally {
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
      setCurrentPlayingId(null);
    }
  };

  // 处理音频播放
  const handlePlayAudio = async () => {
    const uri = entry.media?.[0]?.uri || entry.content;

    // 检查文件是否存在
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        setAudioMissing(true);
        Alert.alert(
          '文件不存在',
          '音频文件已丢失或被删除，无法播放。',
          [{ text: '知道了', style: 'default' }]
        );
        return;
      }
      setAudioMissing(false);
    } catch {
      // getInfoAsync 本身失败时降级到播放，让 VoiceService 处理错误
    }

    try {
      setIsPlayingAudio(true);
      setPlaybackPosition(0);
      setCurrentPlayingId(entry.id);

      await VoiceService.playAudio(
        uri,
        () => {
          setIsPlayingAudio(false);
          setPlaybackPosition(0);
          setCurrentPlayingId(null);
        },
        (position) => {
          setPlaybackPosition(position);
        }
      );
    } catch (error) {
      logger.error('Failed to play audio:', error);
      Alert.alert('播放失败', '无法播放此音频，请重试');
      setIsPlayingAudio(false);
      setPlaybackPosition(0);
      setCurrentPlayingId(null);
    }
  };

  // 格式化录音时长
  const formatDuration = (seconds: number) => formatMMSS(seconds);

  // 根据类型获取左边框颜色
  const getBorderColor = () => {
    switch (entry.type) {
      case 'text': return '#A491D3';    // 紫色
      case 'photo': return '#77C9D4';   // 青色
      case 'voice': return '#F5A623';   // 橙色
      default: return '#D1D1D1';
    }
  };

  const getCardBgColor = () => {
    if (variant === 'calendar') {
      return '#FFFDF9';
    }
    switch (entry.type) {
      case 'text':  return '#E0D9F5'; // 淡紫
      case 'photo': return '#CCE9EF'; // 淡青，弱化照片类型主色
      case 'voice': return '#FCE8C0'; // 淡橙
      default:      return '#FFFFFF';
    }
  };

  const getCardPressedColor = () => {
    if (variant === 'calendar') {
      return '#FBF6EF';
    }
    switch (entry.type) {
      case 'text':  return '#D4CBF2';
      case 'photo': return '#BDDEE5';
      case 'voice': return '#F8DFB0';
      default:      return '#F5F5F5';
    }
  };

  // 照片卡片是否有底部内容（决定图片圆角）
  const hasPhotoFooter = entry.type === 'photo'
    ? !!(entry.content || (entry.tags && entry.tags.length > 0))
    : false;

  const photoImageRadius = hasPhotoFooter
    ? { borderRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
    : { borderRadius: 10 };

  const renderCalendarPhotoBody = () => {
    if (!entry.media || entry.media.length === 0) {
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleCardPress}
          style={[styles.calendarPhotoEmptyState, { height: resolvedPhotoHeight }]}
        >
          <View style={styles.calendarPhotoEmptyBadge}>
            <Ionicons name="images-outline" size={26} color="#9F8F7C" />
          </View>
        </TouchableOpacity>
      );
    }

    if (entry.media.length === 1) {
      const photo = entry.media[0];
      return (
        <View testID={`calendar-photo-card-layout-single-${entry.id}`}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => handleImagePress(0)}
            testID={`calendar-photo-primary-${entry.id}`}
          >
            <Image
              source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
              style={[styles.calendarSinglePhoto, { height: resolvedPhotoHeight }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      );
    }

    const [primary, secondary, tertiary] = entry.media;
    const overflow = entry.media.length - 3;

    return (
      <View
        testID={`calendar-photo-card-layout-multi-${entry.id}`}
        style={[styles.calendarPhotoMultiWrap, { height: resolvedPhotoHeight }]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => handleImagePress(0)}
          style={styles.calendarPhotoPrimary}
          testID={`calendar-photo-primary-${entry.id}`}
        >
          <Image
            source={{ uri: PhotoService.resolvePhotoUri(primary.thumbnail || primary.uri) }}
            style={styles.calendarPhotoImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={styles.calendarPhotoSecondaryColumn}>
          {secondary ? (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleImagePress(1)}
              style={styles.calendarPhotoSecondaryCell}
              testID={`calendar-photo-secondary-cell-1-${entry.id}`}
            >
              <Image
                source={{ uri: PhotoService.resolvePhotoUri(secondary.thumbnail || secondary.uri) }}
                style={styles.calendarPhotoImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.calendarPhotoSecondaryCell} />
          )}
          {tertiary ? (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleImagePress(2)}
              style={styles.calendarPhotoSecondaryCell}
              testID={`calendar-photo-secondary-cell-2-${entry.id}`}
            >
              <Image
                source={{ uri: PhotoService.resolvePhotoUri(tertiary.thumbnail || tertiary.uri) }}
                style={styles.calendarPhotoImage}
                resizeMode="cover"
              />
              {overflow > 0 && (
                <View style={styles.calendarPhotoOverflowMask}>
                  <Text style={styles.calendarPhotoOverflowText}>+{overflow}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.calendarPhotoSecondaryCell} />
          )}
        </View>
      </View>
    );
  };

  const getCalendarBorderColor = () => {
    switch (entry.type) {
      case 'text': return '#DDD0EF';
      case 'photo': return '#D5E8E5';
      case 'voice': return '#EFD8B5';
      default: return '#E6DDD2';
    }
  };

  const renderCalendarTags = () => {
    if (!entry.tags || entry.tags.length === 0) return null;

    return (
      <View
        testID={entry.type === 'photo' ? 'photo-tags-container' : undefined}
        style={[
          styles.calendarTagsContainer,
          entry.type === 'photo' && styles.calendarPhotoTagsContainer,
        ]}
      >
        {(isExpanded ? entry.tags : entry.tags.slice(0, 3)).map((tag, index) => (
          <View
            key={index}
            style={[
              styles.calendarTag,
              entry.type === 'text' && styles.calendarTagTextTone,
              entry.type === 'voice' && styles.calendarTagVoiceTone,
            ]}
          >
            <Text
              style={[
                styles.calendarTagText,
                entry.type === 'text' && styles.calendarTagTextTextTone,
                entry.type === 'voice' && styles.calendarTagTextVoiceTone,
              ]}
            >
              #{tag}
            </Text>
          </View>
        ))}
        {!isExpanded && entry.tags.length > 3 && (
          <Text style={styles.calendarMoreTagsHint}>+{entry.tags.length - 3}</Text>
        )}
      </View>
    );
  };

  const renderCalendarTranscription = () => {
    if (!entry.transcription || entry.type === 'voice') return null;

    return (
      <View style={styles.calendarTranscriptionContainer}>
        <Text
          style={styles.calendarTranscriptionText}
          numberOfLines={isExpanded ? undefined : 2}
        >
          {entry.transcription.text}
        </Text>
      </View>
    );
  };

  const renderCalendarContent = () => {
    if (entry.type === 'text') {
      return (
        <View style={styles.calendarTextCard}>
          <Text style={styles.calendarTextContent}>
            {entry.content}
          </Text>
          {renderCalendarTags()}
          {renderCalendarTranscription()}
        </View>
      );
    }

    if (entry.type === 'photo') {
      const mediaCount = entry.media?.length ?? 0;
      return (
        <View style={styles.calendarPhotoCard}>
          {renderCalendarPhotoBody()}
          <View style={styles.calendarPhotoMeta}>
            <View style={styles.calendarPhotoHeader}>
              <View />
              {mediaCount > 0 ? (
                <View style={styles.calendarPhotoCountPill}>
                  <Text style={styles.calendarPhotoCountText}>{mediaCount} 张</Text>
                </View>
              ) : null}
            </View>
            {entry.content ? (
              <Text
                style={styles.calendarPhotoCaption}
                numberOfLines={isExpanded ? undefined : calendarDensity === 'compact' ? 2 : 3}
              >
                {entry.content}
              </Text>
            ) : null}
            {renderCalendarTags()}
            {renderCalendarTranscription()}
          </View>
        </View>
      );
    }

    if (entry.type === 'voice') {
      if (entry.recordingStatus === 'recording') {
        return (
          <View
            testID={`calendar-recording-status-${entry.id}`}
            style={styles.calendarRecordingCard}
          >
            <View style={styles.calendarRecordingHeader}>
              <TouchableOpacity
                style={[styles.calendarStopButton, isProcessing && styles.buttonDisabled]}
                disabled={isProcessing}
                activeOpacity={0.7}
                onPress={async () => {
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await onStopRecording?.(entry.id);
                  } catch (error) {
                    logger.error('Failed to stop recording:', error);
                  } finally {
                    setTimeout(() => setIsProcessing(false), 300);
                  }
                }}
              >
                <View style={styles.stopIconCompact} />
              </TouchableOpacity>
              <View style={styles.calendarVoiceTrack}>
                <View style={styles.calendarVoiceTrackRow}>
                  <View style={styles.calendarVoiceTrackActive}>
                    <WaveformAnimation isRecording={true} color="#F1B463" />
                  </View>
                  <Text style={styles.calendarVoiceTime}>{formatDuration(entry.recordingDuration || 0)}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      if (!entry.media || entry.media.length === 0) return null;

      return (
        <View style={styles.calendarVoiceCard}>
          <View style={styles.calendarVoiceHeader}>
            {audioMissing ? (
              <View style={styles.audioMissingRow}>
                <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
                <Text style={styles.audioMissingText}>音频文件已丢失</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  testID={`calendar-voice-play-button-${entry.id}`}
                  style={styles.calendarVoicePlayBtn}
                  onPress={isPlayingAudio ? handleStopAudio : handlePlayAudio}
                  activeOpacity={0.85}
                >
                  {isPlayingAudio ? (
                    <Ionicons name="stop" size={20} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="play" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  )}
                </TouchableOpacity>
                <View style={styles.calendarVoiceTrack}>
                  <View style={styles.calendarVoiceTrackRow}>
                    <View style={styles.calendarVoiceTrackActive}>
                      <WaveformAnimation isRecording={isPlayingAudio} color={isPlayingAudio ? '#F0A533' : '#EDC98D'} />
                    </View>
                    <Text style={styles.calendarVoiceTime}>
                      {isPlayingAudio
                        ? formatDuration(Math.floor(playbackPosition / 1000))
                        : formatDuration(entry.media[0].duration ? Math.floor(entry.media[0].duration / 1000) : 0)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
          {(entry.transcription?.text || entry.content) ? (
            <Text
              style={styles.calendarVoiceCaption}
              numberOfLines={isExpanded ? undefined : calendarDensity === 'compact' ? 2 : 3}
            >
              {entry.transcription?.text || entry.content}
            </Text>
          ) : null}
          {renderCalendarTags()}
        </View>
      );
    }

    return null;
  };

  // 判断是否需要展开
  const needsExpansion = useMemo(
    () => entry.content.length > 150 || (entry.tags != null && entry.tags.length > 3),
    [entry.content, entry.tags]
  );

  // 长按仅触发卡片展开，不再弹出 ActionSheet
  const handleLongPress = () => {
    setIsExpanded(true);
  };

  const clearOpenSheetTimeout = () => {
    if (openSheetTimeoutRef.current) {
      clearTimeout(openSheetTimeoutRef.current);
      openSheetTimeoutRef.current = null;
    }
  };

  const clearResetCardTimeout = () => {
    if (resetCardTimeoutRef.current) {
      clearTimeout(resetCardTimeoutRef.current);
      resetCardTimeoutRef.current = null;
    }
  };

  const closeActionSheetAndResetCard = () => {
    clearOpenSheetTimeout();
    clearResetCardTimeout();
    logger.log('[EntryCard] closing action sheet and resetting card', entry.id, interactionState);
    setInteractionState('closing');
    setShowActionSheet(false);
    resetCardTimeoutRef.current = setTimeout(() => {
      setInteractionState('idle');
      resetCardTimeoutRef.current = null;
    }, ENTRY_ACTION_SHEET_EXIT_DURATION);
  };

  const handleSwipeTrigger = (phase: 'willOpen' | 'open', direction?: 'left' | 'right') => {
    logger.log('[EntryCard] swipe trigger', {
      entryId: entry.id,
      phase,
      direction,
      interactionState,
      showActionSheet,
    });

    if (direction && direction !== 'right') {
      logger.log('[EntryCard] ignore non-left swipe direction', entry.id, direction);
      return;
    }

    if (interactionState !== 'idle' || showActionSheet) {
      logger.log('[EntryCard] ignore duplicate swipe trigger', entry.id, interactionState);
      return;
    }

    clearOpenSheetTimeout();
    clearResetCardTimeout();
    swipeableRef.current?.close();
    onActionSheetOpen?.(entry.id);
    setInteractionState('pendingSheet');
    openSheetTimeoutRef.current = setTimeout(() => {
      logger.log('[EntryCard] opening action sheet after delay', entry.id);
      setShowActionSheet(true);
      setInteractionState('sheetOpen');
      openSheetTimeoutRef.current = null;
    }, ACTION_SHEET_OPEN_DELAY);
  };

  const renderRightActions = () => <View style={{ width: 96 }} />;

  const handleImagePress = (index: number) => {
    logger.log('图片被点击，打开图片查看器，index:', index);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  // 处理卡片点击 - 根据类型执行不同操作
  const handleCardPress = () => {
    logger.log('卡片被点击，entry.id:', entry.id, 'type:', entry.type);

    // 录音中不允许点击
    if (entry.recordingStatus === 'recording') {
      logger.log('录音中，忽略点击');
      return;
    }

    switch (entry.type) {
      case 'text':
        logger.log('文本记录，触发查看');
        onView?.(entry);
        break;

      case 'photo':
        // 图片记录：点击打开图片查看器
        logger.log('图片记录，打开图片查看器');
        setShowImageViewer(true);
        break;

      case 'voice':
        // 语音记录：点击播放
        if (entry.media && entry.media.length > 0 && !isPlayingAudio) {
          logger.log('语音记录，触发播放');
          handlePlayAudio();
        }
        break;

      default:
        break;
    }
  };

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
            cardAnimatedStyle,
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
                variant === 'calendar' && { borderColor: getCalendarBorderColor(), borderWidth: 1 },
                {
                  backgroundColor: isPressed ? getCardPressedColor() : getCardBgColor(),
                },
              ]}
            >
              <View>
            {/* 卡片主内容 */}
            <View style={[
              entry.type === 'voice' ? styles.contentVoice : styles.content,
              entry.type === 'text' && styles.contentText,
              entry.type === 'photo' && styles.contentPhoto,
              variant === 'calendar' && styles.calendarContent,
            ]}>
              {variant === 'calendar' ? (
                renderCalendarContent()
              ) : entry.type === 'text' ? (
                // 文本内容
                <Text
                  style={styles.textContent}
                  numberOfLines={isExpanded ? undefined : 4}
                >
                  {entry.content}
                </Text>
              ) : entry.type === 'photo' && entry.media && entry.media.length > 0 ? (
                <>
                  <PhotoGrid
                    photos={entry.media}
                    maxPhotoHeight={resolvedPhotoHeight}
                    photoImageRadius={photoImageRadius}
                    onPhotoPress={(index) => handleImagePress(index)}
                  />
                  {entry.content && (
                    <Text style={styles.photoCaption} numberOfLines={isExpanded ? undefined : 2}>
                      {entry.content}
                    </Text>
                  )}
                </>
               ) : entry.type === 'voice' ? (
                 entry.recordingStatus === 'recording' ? (
                   <View
                     style={styles.recordingContainer}
                   >
                     <View style={styles.recordingCompact}>
                       {/* 左侧：停止按钮 */}
                       <TouchableOpacity
                         style={[styles.stopButtonCompact, isProcessing && styles.buttonDisabled]}
                         disabled={isProcessing}
                         activeOpacity={0.7}
                         onPress={async () => {
                           if (isProcessing) return;
                           setIsProcessing(true);
                           try {
                             await onStopRecording?.(entry.id);
                           } catch (error) {
                             logger.error('Failed to stop recording:', error);
                           } finally {
                             setTimeout(() => setIsProcessing(false), 300);
                           }
                         }}
                       >
                         <View style={styles.stopIconCompact} />
                       </TouchableOpacity>

                       {/* 中间：波形 + 文字 */}
                       <View style={styles.recordingCenter}>
                         <View style={styles.waveformCompact}>
                           <WaveformAnimation isRecording={true} color="#F5A68D" />
                         </View>
                         <Text style={styles.recordingLabel}>录音中...</Text>
                       </View>

                       {/* 右侧：时长 */}
                       <Text style={styles.recordingTimeCompact}>
                         {formatDuration(entry.recordingDuration || 0)}
                       </Text>
                     </View>
                    </View>
                 ) : entry.media && entry.media.length > 0 ? (
                   <View style={styles.voiceCard}>
                     {/* 播放行：按钮 + 波形 + 时长 */}
                     <View style={styles.voicePlayRow}>
                       {audioMissing ? (
                         <View style={styles.audioMissingRow}>
                           <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
                           <Text style={styles.audioMissingText}>音频文件已丢失</Text>
                         </View>
                       ) : (
                         <>
                           <TouchableOpacity
                             style={styles.voicePlayBtn}
                             onPress={isPlayingAudio ? handleStopAudio : handlePlayAudio}
                             activeOpacity={0.8}
                           >
                             {isPlayingAudio ? (
                               <Ionicons name="stop" size={22} color="#FFFFFF" />
                             ) : (
                               <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                             )}
                           </TouchableOpacity>

                           <View style={styles.voiceWaveform}>
                             <WaveformAnimation isRecording={isPlayingAudio} color={isPlayingAudio ? '#F5A623' : '#C4C4C4'} />
                           </View>

                           <Text style={styles.voiceDuration}>
                             {isPlayingAudio
                               ? formatDuration(Math.floor(playbackPosition / 1000))
                               : formatDuration(entry.media[0].duration ? Math.floor(entry.media[0].duration / 1000) : 0)
                             }
                           </Text>
                         </>
                       )}
                     </View>

                     {/* 转录/描述文字 */}
                     {(entry.transcription?.text || entry.content) ? (
                       <Text style={styles.voiceCaption} numberOfLines={isExpanded ? undefined : 3}>
                         {entry.transcription?.text || entry.content}
                       </Text>
                     ) : null}
                   </View>
                ) : null
              ) : null}

              {/* 标签（如果有） */}
              {variant !== 'calendar' && entry.tags && entry.tags.length > 0 && (
                <View
                  testID={entry.type === 'photo' ? 'photo-tags-container' : undefined}
                  style={entry.type === 'photo' ? styles.photoTagsContainer : styles.tagsContainer}
                >
                  {(isExpanded ? entry.tags : entry.tags.slice(0, 3)).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                  {!isExpanded && entry.tags.length > 3 && (
                    <Text style={styles.moreTagsHint}>+{entry.tags.length - 3}</Text>
                  )}
                </View>
              )}

              {/* 转录文本（如果有） */}
              {variant !== 'calendar' && entry.transcription && (
                <View style={styles.transcriptionContainer}>
                  <Text style={styles.transcriptionLabel}>转录</Text>
                  <Text
                    style={styles.transcriptionText}
                    numberOfLines={isExpanded ? undefined : 2}
                  >
                    {entry.transcription.text}
                  </Text>
                </View>
              )}
            </View>

            {/* 展开提示（如果需要） */}
            {needsExpansion && !isExpanded && variant !== 'calendar' && (
              <Text style={styles.expandHint}>点击展开更多</Text>
            )}
              </View>

            {/* 图片查看器 */}
            {entry.type === 'photo' && entry.media?.[0]?.uri && (
              <ImageViewer
                visible={showImageViewer}
                imageUri={entry.media[selectedImageIndex]?.uri ?? entry.media[0].uri}
                onClose={() => {
                  setShowImageViewer(false);
                }}
              />
            )}
            </Pressable>
          </View>
        </Animated.View>

        <EntryActionSheet
          visible={showActionSheet}
          entryType={entry.type}
          onEdit={() => {
            onEdit?.(entry);
            closeActionSheetAndResetCard();
          }}
          onDelete={() => {
            onDelete(entry.id);
            closeActionSheetAndResetCard();
          }}
          onClose={closeActionSheetAndResetCard}
        />
      </>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
    elevation: 0,
  },
  calendarCardShadow: {
    borderRadius: 10,
    borderColor: 'rgba(139, 115, 85, 0.06)',
    shadowColor: '#5A4330',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  calendarCardShell: {
    borderRadius: 10,
  },
  calendarCardContainer: {
    borderRadius: 10,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  calendarContent: {
    padding: 0,
    gap: 0,
  },
  contentText: {
    borderRadius: 12,
  },
  contentPhoto: {
    padding: 0,
    gap: 0,
  },
  contentVoice: {
    padding: 0,
  },
  textContent: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  photoCaption: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#525252',
  },
  calendarKickerText: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8B76C8',
    marginBottom: 10,
    fontWeight: '700',
  },
  calendarKickerPhoto: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8A7E70',
    marginBottom: 8,
    fontWeight: '700',
  },
  calendarKickerVoice: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#B28646',
    marginBottom: 10,
    fontWeight: '700',
  },
  calendarTextCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  calendarTextContent: {
    fontSize: 17,
    lineHeight: 29,
    color: '#3F374B',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  calendarPhotoCard: {
    padding: 10,
  },
  calendarPhotoMeta: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 10,
  },
  calendarPhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarPhotoCountPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FBF6EF',
    borderWidth: 1,
    borderColor: '#EAE0D3',
  },
  calendarPhotoCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A8B7B',
  },
  calendarPhotoCaption: {
    fontSize: 14,
    lineHeight: 22,
    color: '#67584B',
  },
  calendarPhotoEmptyState: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF7F1',
    borderWidth: 1,
    borderColor: '#E7DDD0',
    borderStyle: 'dashed',
    paddingHorizontal: 24,
  },
  calendarPhotoEmptyBadge: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#ECE1D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  calendarSinglePhoto: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#ECE7E0',
  },
  calendarPhotoMultiWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  calendarPhotoPrimary: {
    flex: 1.35,
    borderRadius: 6,
    overflow: 'hidden',
  },
  calendarPhotoSecondaryColumn: {
    flex: 0.75,
    gap: 6,
  },
  calendarPhotoSecondaryCell: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#ECE7E0',
  },
  calendarPhotoImage: {
    width: '100%',
    height: '100%',
  },
  calendarPhotoOverflowMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  calendarPhotoOverflowText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  calendarTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  calendarPhotoTagsContainer: {
    marginTop: 10,
  },
  calendarTag: {
    backgroundColor: '#FFFCF7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#EAE0D5',
  },
  calendarTagTextTone: {
    borderColor: '#E2D7F0',
    backgroundColor: '#FFFCF7',
  },
  calendarTagVoiceTone: {
    borderColor: '#EFDDBE',
    backgroundColor: '#FFFCF7',
  },
  calendarTagText: {
    fontSize: 12,
    color: '#7E7486',
    fontWeight: '500',
  },
  calendarTagTextTextTone: {
    color: '#7D69B8',
  },
  calendarTagTextVoiceTone: {
    color: '#9A7D55',
  },
  calendarMoreTagsHint: {
    fontSize: 12,
    color: '#A3968A',
    alignSelf: 'center',
  },
  calendarTranscriptionContainer: {
    marginTop: 12,
    borderRadius: 6,
    backgroundColor: '#FBF7F1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ECE2D7',
  },
  calendarTranscriptionText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#64594F',
  },
  tag: {
    backgroundColor: '#F9731620',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  tagText: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '500',
  },
  moreTagsHint: {
    fontSize: 12,
    color: '#A3A3A3',
    alignSelf: 'center',
  },
  transcriptionContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  transcriptionLabel: {
    fontSize: 11,
    color: '#737373',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  transcriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#525252',
  },
  expandHint: {
    fontSize: 12,
    color: '#A3A3A3',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  recordingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  recordingCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recordingCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  waveformCompact: {
    width: '100%',
    height: 28,
  },
  recordingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },
  recordingTimeCompact: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
  },
  stopButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5A68D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5A68D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopIconCompact: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  playButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  voicePlayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  voicePlayCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  voiceWaveformCompact: {
    flex: 1,
    height: 28,
  },
  voiceTimeCompact: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  photoTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 12,
  },
  // 新语音卡片样式
  voiceCard: {
    padding: 16,
    gap: 14,
    borderRadius: 12,
  },
  voicePlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  voicePlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  voiceWaveform: {
    flex: 1,
    height: 32,
  },
  voiceDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
    minWidth: 38,
    textAlign: 'right',
  },
  voiceCaption: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  audioMissingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  audioMissingText: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  calendarVoiceCard: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  calendarVoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 1,
  },
  calendarVoicePlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F2A62A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F2A62A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  calendarVoiceTrack: {
    flex: 1,
  },
  calendarVoiceTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarVoiceTrackActive: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  calendarVoiceHint: {
    fontSize: 11,
    color: '#9C8260',
  },
  calendarVoiceTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A4865C',
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'right',
  },
  calendarVoiceCaption: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#8B735B',
  },
  calendarRecordingCard: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  calendarRecordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 2,
  },
  calendarStopButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEAE78',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EEAE78',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
});

// 使用 React.memo 优化性能，避免不必要的重新渲染
// 注意：以 named export 形式导出，与 Timeline.v2.tsx 的 import { EntryCard } 保持一致
const MemoizedEntryCard = React.memo(EntryCard);
export { MemoizedEntryCard as EntryCard };
