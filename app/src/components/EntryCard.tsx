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
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { PhotoService } from '@/src/services/photoService';
import WaveformAnimation from './WaveformAnimation';
import { logger } from '@/src/utils/logger';
import { ImageViewer, OriginLayout } from './ImageViewer';
import { Swipeable } from 'react-native-gesture-handler';
import { useSettingsStore, PHOTO_HEIGHT_VALUES } from '@/src/store/settingsStore';
import { EntryActionSheet, ENTRY_ACTION_SHEET_EXIT_DURATION } from './EntryActionSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_RESTING_TRANSLATE_X = -28;
const CARD_SHIFT_DURATION = 160;
const ACTION_SHEET_OPEN_DELAY = 100;

// 卡片内容宽度（考虑边距）
const getCardContentWidth = () => SCREEN_WIDTH - 40; // 20px padding on each side

// 计算图片高度，保持宽高比，最大高度由设置决定
const calculateImageHeight = (aspectRatio: number | undefined, maxHeight: number): number => {
  if (!aspectRatio || aspectRatio <= 0) return Math.min(200, maxHeight);
  const calculatedHeight = getCardContentWidth() / aspectRatio;
  return Math.min(calculatedHeight, maxHeight);
};

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit?: (entry: Entry) => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
  cardSpacing?: number;
  enterDelay?: number;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (entryId: string) => void;
}

function EntryCard({
  entry,
  onDelete,
  onEdit,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  cardSpacing = 12,
  enterDelay = 0,
  isActionSheetActive,
  onActionSheetOpen,
}: EntryCardProps) {
  type CardInteractionState = 'idle' | 'cardShifted' | 'sheetOpen' | 'closing';
  const { currentPlayingId, setCurrentPlayingId } = useEntryStore();
  const photoHeight = useSettingsStore((s) => s.photoHeight);
  const maxPhotoHeight = PHOTO_HEIGHT_VALUES[photoHeight];
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
  const [originLayout, setOriginLayout] = useState<OriginLayout | null>(null);
  const thumbnailRef = useRef<React.ElementRef<typeof Image>>(null!);
  const swipeableRef = useRef<Swipeable>(null);
  const [photoError, setPhotoError] = useState(false);
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

  // 挂载时检查音频文件是否存在
  useEffect(() => {
    if (entry.type !== 'voice') return;
    const uri = entry.media?.uri || entry.content;
    if (!uri) return;
    FileSystem.getInfoAsync(uri)
      .then(info => { if (!info.exists) setAudioMissing(true); })
      .catch(() => {});
  }, [entry.id]);

  useEffect(() => {
    setPhotoError(false);
    if (entry.type !== 'photo') return;
    const uri = entry.media?.uri;
    if (!uri) return;
    FileSystem.getInfoAsync(uri)
      .then(info => { if (!info.exists) setPhotoError(true); })
      .catch(() => {});
  }, [entry.id]);

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
    const uri = entry.media?.uri || entry.content;

    // 检查文件是否存在
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        Alert.alert(
          '文件不存在',
          '音频文件已丢失或被删除，无法播放。',
          [{ text: '知道了', style: 'default' }]
        );
        return;
      }
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
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    switch (entry.type) {
      case 'text':  return '#E0D9F5'; // 淡紫
      case 'photo': return '#CCE9EF'; // 淡青，弱化照片类型主色
      case 'voice': return '#FCE8C0'; // 淡橙
      default:      return '#FFFFFF';
    }
  };

  const getCardPressedColor = () => {
    switch (entry.type) {
      case 'text':  return '#D4CBF2';
      case 'photo': return '#BDDEE5';
      case 'voice': return '#F8DFB0';
      default:      return '#F5F5F5';
    }
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

  const shiftCardToRestingPosition = () => {
    cardTranslateX.value = withTiming(CARD_RESTING_TRANSLATE_X, {
      duration: CARD_SHIFT_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  };

  const resetCardPosition = () => {
    cardTranslateX.value = withTiming(0, {
      duration: CARD_SHIFT_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeActionSheetAndResetCard = () => {
    clearOpenSheetTimeout();
    clearResetCardTimeout();
    logger.log('[EntryCard] closing action sheet and resetting card', entry.id, interactionState);
    setInteractionState('closing');
    setShowActionSheet(false);
    resetCardTimeoutRef.current = setTimeout(() => {
      logger.log('[EntryCard] reset card position complete', entry.id);
      resetCardPosition();
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
    setInteractionState('cardShifted');
    shiftCardToRestingPosition();
    openSheetTimeoutRef.current = setTimeout(() => {
      logger.log('[EntryCard] opening action sheet after delay', entry.id);
      setShowActionSheet(true);
      setInteractionState('sheetOpen');
      openSheetTimeoutRef.current = null;
    }, ACTION_SHEET_OPEN_DELAY);
  };

  const renderRightActions = () => <View style={{ width: 96 }} />;

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
        // 文本记录：点击编辑
        logger.log('文本记录，触发编辑');
        onEdit?.(entry);
        break;

      case 'photo':
        // 图片记录：点击打开图片查看器
        logger.log('图片记录，打开图片查看器');
        if (photoError) return;
        if (thumbnailRef.current) {
          thumbnailRef.current.measureInWindow((x, y, width, height) => {
            setOriginLayout({ x, y, width, height });
            setShowImageViewer(true);
          });
        } else {
          setShowImageViewer(true);
        }
        break;

      case 'voice':
        // 语音记录：点击播放
        if (audioMissing) return;
        if (entry.media && !isPlayingAudio) {
          logger.log('语音记录，触发播放');
          handlePlayAudio();
        }
        break;

      default:
        break;
    }
  };

  // 处理图片点击（阻止事件冒泡）
  const handleImagePress = () => {
    if (photoError) return;
    logger.log('图片被点击，打开查看器');
    if (thumbnailRef.current) {
      thumbnailRef.current.measureInWindow((x, y, width, height) => {
        setOriginLayout({ x, y, width, height });
        setShowImageViewer(true);
      });
    } else {
      setShowImageViewer(true);
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
            cardAnimatedStyle,
            { backgroundColor: isPressed ? getCardPressedColor() : getCardBgColor(), marginBottom: cardSpacing },
          ]}
        >
          <Pressable
            testID="entry-card"
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            onPress={handleCardPress}
            onLongPress={handleLongPress}
            style={[
              styles.cardContainer,
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
              entry.type === 'photo' && styles.contentPhoto
            ]}>
              {entry.type === 'text' ? (
                // 文本内容
                <Text
                  style={styles.textContent}
                  numberOfLines={isExpanded ? undefined : 4}
                >
                  {entry.content}
                </Text>
              ) : entry.type === 'photo' && entry.media?.uri ? (
                // 照片内容 - 自适应宽高比
                <>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleImagePress}
                  >
                    {photoError ? (
                      <View style={[styles.photoImage, styles.photoMissing]}>
                        <Ionicons name="image-outline" size={32} color="#A3A3A3" />
                        <Text style={styles.photoMissingText}>图片已丢失</Text>
                      </View>
                    ) : (
                      <Image
                        ref={thumbnailRef}
                        source={{ uri: PhotoService.resolvePhotoUri(entry.media?.thumbnail || entry.media.uri) }}
                        style={[
                          styles.photoImage,
                          { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight) }
                        ]}
                        resizeMode="contain"
                        testID="photo-image"
                        onError={() => setPhotoError(true)}
                      />
                    )}
                  </TouchableOpacity>
                  {entry.content && (
                    <Text style={styles.photoCaption} numberOfLines={isExpanded ? undefined : 2}>
                      {entry.content}
                    </Text>
                  )}
                </>
               ) : entry.type === 'voice' ? (
                 entry.recordingStatus === 'recording' ? (
                   <View style={styles.recordingContainer}>
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
                 ) : entry.media ? (
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
                               : formatDuration(entry.media.duration ? Math.floor(entry.media.duration / 1000) : 0)
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
              {entry.tags && entry.tags.length > 0 && (
                <View style={styles.tagsContainer}>
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
              {entry.transcription && (
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
            {needsExpansion && !isExpanded && (
              <Text style={styles.expandHint}>点击展开更多</Text>
            )}
            </View>

            {/* 图片查看器 */}
            {entry.type === 'photo' && entry.media?.uri && (
              <ImageViewer
                visible={showImageViewer}
                imageUri={entry.media.uri}
                onClose={() => {
                  setShowImageViewer(false);
                  setOriginLayout(null);
                }}
                originLayout={originLayout ?? undefined}
                thumbnailRef={thumbnailRef}
              />
            )}
          </Pressable>
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
  cardContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  contentText: {
    borderRadius: 12,
  },
  contentPhoto: {
    borderRadius: 12,
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
  photoImage: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#ECE7E0',
  },
  photoMissing: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoMissingText: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  photoCaption: {
    fontSize: 14,
    lineHeight: 20,
    color: '#525252',
    marginTop: 8,
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
});

// 使用 React.memo 优化性能，避免不必要的重新渲染
// 注意：以 named export 形式导出，与 Timeline.v2.tsx 的 import { EntryCard } 保持一致
const MemoizedEntryCard = React.memo(EntryCard);
export { MemoizedEntryCard as EntryCard };
