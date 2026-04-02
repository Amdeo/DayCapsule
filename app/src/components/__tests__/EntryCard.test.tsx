/**
 * EntryCard — 滑动操作测试
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPlaybackStoreState = {
  currentPlayingId: null as string | null,
  setCurrentPlayingId: jest.fn(),
};

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({}),
}));

jest.mock('@/src/store/entryPlaybackUIStore', () => ({
  useEntryPlaybackUIStore: (selector: (state: typeof mockPlaybackStoreState) => unknown) =>
    selector(mockPlaybackStoreState),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: (selector: (s: any) => any) => selector({ photoHeight: 'default', calendarDensity: 'default' }),
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { stopPlayback: jest.fn(), playAudio: jest.fn() },
}));

jest.mock('@/src/services/photoService', () => {
  const PhotoService = {
    resolvePhotoUri: (uri: string) => uri,
    getPreferredPhotoUri: (media: any, kind: 'thumbnail' | 'full') => {
      const candidate = kind === 'thumbnail'
        ? (media.thumbnail || media.remoteThumbnail || media.uri || media.remoteUri || '')
        : (media.remoteUri || media.uri || '');
      return candidate ? PhotoService.resolvePhotoUri(candidate) : '';
    },
    getFallbackPhotoUri: (media: any, failedUri: string, kind: 'thumbnail' | 'full') => {
      const candidates = kind === 'thumbnail'
        ? [media.thumbnail, media.remoteThumbnail, media.uri, media.remoteUri]
        : [media.remoteUri, media.uri];
      const index = candidates.findIndex((candidate) => candidate === failedUri);
      const candidate = index >= 0 ? (candidates[index + 1] ?? null) : (candidates[0] ?? null);
      return candidate ? PhotoService.resolvePhotoUri(candidate) : null;
    },
  };

  return { PhotoService };
});

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('../WaveformAnimation', () => 'WaveformAnimation');
jest.mock('../ImageViewer', () => {
  const { View, Text } = require('react-native');
  return {
    ImageViewer: ({ visible, imageUri }: { visible: boolean; imageUri?: string; originLayout?: unknown; thumbnailRef?: unknown }) =>
      visible ? (
        <View testID="image-viewer">
          <Text testID="image-viewer-uri">{imageUri}</Text>
        </View>
      ) : null,
  };
});
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>;
  return {
    Ionicons: MockIcon,
    FontAwesome: MockIcon,
    MaterialIcons: MockIcon,
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('../../../__mocks__/react-native-reanimated.js');
  const mockFadeInRight = {
    duration: jest.fn(function duration() {
      return this;
    }),
    delay: jest.fn(function delay() {
      return this;
    }),
  };
  Reanimated.default.call = () => {};
  Reanimated.FadeInRight = mockFadeInRight;
  Reanimated.__mockFadeInRight = mockFadeInRight;
  return Reanimated;
});

jest.mock('react-native/Libraries/Image/Image', () => {
  const mockComponent = jest.requireActual('react-native/jest/mockComponent').default;
  const Image = mockComponent(
    '../Libraries/Image/Image',
    {
      measureInWindow(callback: (x: number, y: number, width: number, height: number) => void) {
        callback(0, 100, 200, 100);
      },
    },
    true
  );

  return {
    __esModule: true,
    default: Image,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../EntryActionSheet', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    EntryActionSheet: ({ visible, onEdit, onDelete, onClose }: any) => {
      if (!visible) return null;
      return (
        <View testID="entry-action-sheet">
          <TouchableOpacity testID="action-sheet-edit" onPress={() => { onEdit(); onClose(); }}>
            <Text>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="action-sheet-delete" onPress={() => { onDelete(); onClose(); }}>
            <Text>删除</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="action-sheet-cancel" onPress={onClose}>
            <Text>取消</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

// 模拟 Swipeable 并透传滑动回调
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Swipeable = React.forwardRef(({ children, onSwipeableOpen, onSwipeableWillOpen }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    return (
      <View testID="swipeable" onSwipeableOpen={onSwipeableOpen} onSwipeableWillOpen={onSwipeableWillOpen}>
        {children}
      </View>
    );
  });

  Swipeable.displayName = 'Swipeable';

  return { Swipeable };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as ReanimatedModule from 'react-native-reanimated';
import { logger } from '@/src/utils/logger';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { VoiceService } from '@/src/services/voiceService';
import { EntryCard } from '../EntryCard';
import { ENTRY_ACTION_SHEET_EXIT_DURATION } from '../entry-action-sheet/entryActionSheetConfig';
import { Entry } from '@/src/types/entry';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockEntry: Entry = {
  id: 'test-1',
  type: 'text',
  content: '测试条目内容',
  tags: ['标签1', '标签2'],
  timestamp: 1700000000000,
  syncStatus: 'synced',
};

const longTextEntry: Entry = {
  id: 'test-2',
  type: 'text',
  content: '这是一条很长的文本记录，'.repeat(12),
  tags: ['标签1', '标签2', '标签3', '标签4'],
  timestamp: 1700000000000,
  syncStatus: 'synced',
};

const uploadingVoiceEntry: Entry = {
  id: 'voice-uploading-1',
  type: 'voice',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'uploading',
  recordingStatus: 'completed',
  media: [{ uri: 'file:///voice.m4a', mimeType: 'audio/m4a', size: 2048, duration: 12000 }],
};

const pendingUploadVoiceEntry: Entry = {
  id: 'voice-pending-upload-1',
  type: 'voice',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'pending_upload',
  recordingStatus: 'completed',
  media: [{ uri: 'file:///voice.m4a', mimeType: 'audio/m4a', size: 2048, duration: 12000 }],
};

const pendingHydrationVoiceEntry: Entry = {
  id: 'voice-pending-hydration-1',
  type: 'voice',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'synced',
  recordingStatus: 'completed',
  media: [{
    uri: 'http://101.43.120.134:8081/api/media/voice-1',
    remoteUri: 'http://101.43.120.134:8081/api/media/voice-1',
    mimeType: 'audio/m4a',
    size: 2048,
    duration: 12000,
  }],
};

const processingPhotoEntry: Entry = {
  id: 'photo-processing-1',
  type: 'photo',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'synced',
  localReadyState: 'processing',
  media: [{ uri: 'file://photo-processing.jpg', mimeType: 'image/jpeg', size: 1024 }],
};

const playableVoiceEntry: Entry = {
  id: 'voice-playable-1',
  type: 'voice',
  content: '一段语音说明',
  timestamp: 1700000000000,
  syncStatus: 'synced',
  recordingStatus: 'completed',
  media: [{ uri: 'file:///voice-playable.m4a', mimeType: 'audio/m4a', size: 2048, duration: 12000 }],
};

const processingVoiceEntry: Entry = {
  id: 'voice-processing-1',
  type: 'voice',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'pending_upload',
  localReadyState: 'processing',
  recordingStatus: 'completed',
  recordingDuration: 12,
  media: [{ uri: 'file:///voice-processing.m4a', mimeType: 'audio/m4a', size: 2048, duration: 12000 }],
};

const recordingVoiceEntry: Entry = {
  id: 'voice-recording-1',
  type: 'voice',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'pending_upload',
  recordingStatus: 'recording',
  recordingDuration: 12,
  media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
};

const stoppingVoiceEntry: Entry = {
  id: 'voice-stopping-1',
  type: 'voice',
  content: '',
  timestamp: 1700000000000,
  syncStatus: 'pending_upload',
  recordingStatus: 'stopping',
  recordingDuration: 12,
  media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
};

const conflictCopyEntry: Entry = {
  id: 'conflict-copy-1',
  type: 'text',
  content: '冲突版本',
  timestamp: 1700000000000,
  syncStatus: 'failed',
  conflictedCopyOf: 'origin-1',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EntryCard swipe actions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (ReanimatedModule as any).__mockFadeInRight.duration.mockClear();
    (ReanimatedModule as any).__mockFadeInRight.delay.mockClear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('does not show action sheet by default', () => {
    const { queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    expect(queryByTestId('entry-action-sheet')).toBeNull();
  });

  it('renders uploading indicator for voice entries that are still uploading', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <EntryCard entry={uploadingVoiceEntry} onDelete={jest.fn()} />
    );

    expect(getByTestId('voice-uploading-button-voice-uploading-1')).toBeTruthy();
    expect(getByTestId('voice-uploading-spinner-voice-uploading-1')).toBeTruthy();
    expect(getByTestId('voice-uploading-label-voice-uploading-1')).toBeTruthy();
    expect(queryByTestId('voice-uploading-spinner-voice-uploading-1')).toBeTruthy();
    expect(queryByTestId('calendar-voice-play-button-voice-uploading-1')).toBeNull();
  });

  it('shows 冲突副本 badge for failed conflict copies', () => {
    const { getByText } = render(
      <EntryCard entry={conflictCopyEntry} onDelete={jest.fn()} />
    );

    expect(getByText('冲突副本')).toBeTruthy();
  });

  it('shows 待上传 for completed voice entries waiting for background upload', () => {
    const { getAllByText } = render(
      <EntryCard entry={pendingUploadVoiceEntry} onDelete={jest.fn()} />
    );

    expect(getAllByText('待上传').length).toBeGreaterThan(0);
  });

  it('shows 准备中 and hides the play button for voice entries whose media is still remote-only', () => {
    const { getByText, queryByText, queryByTestId } = render(
      <EntryCard entry={pendingHydrationVoiceEntry} onDelete={jest.fn()} />
    );

    expect(getByText('准备中')).toBeTruthy();
    expect(queryByText('待上传')).toBeNull();
    expect(queryByTestId('voice-uploading-button-voice-pending-hydration-1')).toBeNull();
  });

  it('shows a photo preview with preparing hint when localReadyState is processing', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EntryCard entry={processingPhotoEntry} onDelete={jest.fn()} />
    );

    expect(getByTestId('photo-image-0')).toBeTruthy();
    expect(getByText('准备中')).toBeTruthy();
    expect(queryByText('待上传')).toBeNull();
  });

  it('shows voice duration and disabled playback placeholder when localReadyState is processing', async () => {
    const { getByTestId, getByText } = render(
      <EntryCard entry={processingVoiceEntry} onDelete={jest.fn()} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('voice-processing-button-voice-processing-1'));
    });

    expect(getByText('准备中')).toBeTruthy();
    expect(getByText('00:12')).toBeTruthy();
    expect(VoiceService.playAudio).not.toHaveBeenCalled();
  });

  it('keeps text cards rendering normally when localReadyState is ready', () => {
    const { getByText, queryByText } = render(
      <EntryCard entry={{ ...mockEntry, localReadyState: 'ready' }} onDelete={jest.fn()} />
    );

    expect(getByText('测试条目内容')).toBeTruthy();
    expect(queryByText('准备中')).toBeNull();
  });

  it('shows 处理中 and disables stop button when voice entry is stopping', () => {
    const { getByText, getByTestId, queryByText } = render(
      <EntryCard entry={stoppingVoiceEntry} onDelete={jest.fn()} onStopRecording={jest.fn()} />
    );
    const stopButton = getByTestId('voice-stop-button-voice-stopping-1');

    expect(getByText('处理中...')).toBeTruthy();
    expect(queryByText('录音中...')).toBeNull();
    expect(
      stopButton.props.accessibilityState?.disabled ?? stopButton.props['aria-disabled'] ?? false
    ).toBe(true);
  });

  it('calls onStopRecording when pressing the stop button of a recording voice card', async () => {
    const onStopRecording = jest.fn();

    render(
      <EntryCard
        entry={recordingVoiceEntry}
        onDelete={jest.fn()}
        onStopRecording={onStopRecording}
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('voice-stop-button-voice-recording-1'));
    });

    expect(onStopRecording).toHaveBeenCalledWith('voice-recording-1');
  });

  it('ignores duplicate stop presses while the first stop is still pending', async () => {
    let resolveStop!: () => void;
    const onStopRecording = jest.fn(() => new Promise<void>((resolve) => {
      resolveStop = resolve;
    }));

    render(
      <EntryCard
        entry={recordingVoiceEntry}
        onDelete={jest.fn()}
        onStopRecording={onStopRecording}
      />
    );

    const stopButton = screen.getByTestId('voice-stop-button-voice-recording-1');

    await act(async () => {
      fireEvent.press(stopButton);
      fireEvent.press(stopButton);
    });

    expect(onStopRecording).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStop();
    });
  });

  it('does not render pause or resume controls for recording voice cards', () => {
    const { queryByTestId } = render(
      <EntryCard entry={recordingVoiceEntry} onDelete={jest.fn()} />
    );

    expect(queryByTestId('voice-pause-button-voice-recording-1')).toBeNull();
    expect(queryByTestId('voice-resume-button-voice-recording-1')).toBeNull();
  });

  it('shows action sheet only after the delayed post-swipe timing', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });

    expect(queryByTestId('entry-action-sheet')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByTestId('entry-action-sheet')).toBeTruthy();
  });

  it('triggers the delayed action sheet from onSwipeableWillOpen', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableWillOpen('right');
    });

    expect(queryByTestId('entry-action-sheet')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByTestId('entry-action-sheet')).toBeTruthy();
  });

  it('marks the card active as soon as swipe starts opening', () => {
    const onActionSheetOpen = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onActionSheetOpen={onActionSheetOpen} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableWillOpen('right');
    });

    expect(onActionSheetOpen).toHaveBeenCalledWith(mockEntry.id);
  });

  it('ignores duplicate swipe lifecycle callbacks and opens the sheet only once', () => {
    const onActionSheetOpen = jest.fn();
    const { getByTestId, getAllByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onActionSheetOpen={onActionSheetOpen} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableWillOpen('right');
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });

    expect(onActionSheetOpen).toHaveBeenCalledTimes(1);
    expect(getAllByTestId('entry-action-sheet')).toHaveLength(1);
  });

  it('calls onEdit when edit is pressed in action sheet', () => {
    const onEdit = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onEdit={onEdit} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('action-sheet-edit'));

    expect(onEdit).toHaveBeenCalledWith(mockEntry);
  });

  it('calls onDelete when delete is confirmed in action sheet', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={onDelete} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('action-sheet-delete'));

    expect(onDelete).toHaveBeenCalledWith(mockEntry.id);
  });

  it('closes action sheet when cancel is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });
    fireEvent.press(getByTestId('action-sheet-cancel'));

    expect(queryByTestId('entry-action-sheet')).toBeNull();
  });

  it('allows reopening the action sheet after it fully closes', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });

    fireEvent.press(getByTestId('action-sheet-cancel'));

    act(() => {
      jest.advanceTimersByTime(ENTRY_ACTION_SHEET_EXIT_DURATION);
    });

    expect(queryByTestId('entry-action-sheet')).toBeNull();

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });

    expect(getByTestId('entry-action-sheet')).toBeTruthy();
  });

  it('applies FadeInRight entering with the provided delay and no exiting animation', () => {
    const screen = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} enterDelay={120} />
    );

    const outerCard = screen.getByTestId('entry-card-container');

    expect(outerCard.props.entering).toBeDefined();
    expect(outerCard.props.exiting).toBeUndefined();
    expect((ReanimatedModule as any).__mockFadeInRight.duration).toHaveBeenCalledWith(expect.any(Number));
    expect((ReanimatedModule as any).__mockFadeInRight.delay).toHaveBeenCalledWith(120);
  });

  it('uses onView for text card press instead of onEdit', () => {
    const onView = jest.fn();
    const onEdit = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onView={onView} onEdit={onEdit} />
    );

    fireEvent.press(getByTestId('entry-card'));

    expect(onView).toHaveBeenCalledWith(mockEntry);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('opens the image viewer when pressing a photo card body', () => {
    const photoEntry: Entry = {
      id: 'photo-card-open-1',
      type: 'photo',
      content: '',
      timestamp: 1700000000000,
      syncStatus: 'synced',
      media: [{ uri: 'file://photo-open.jpg', mimeType: 'image/jpeg', size: 1024 }],
    };

    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);

    fireEvent.press(screen.getByTestId('entry-card'));

    expect(screen.getByTestId('image-viewer-uri').props.children).toBe('file://photo-open.jpg');
  });

  it('shows a playback failure alert when voice playback throws', async () => {
    (VoiceService.playAudio as jest.Mock).mockRejectedValueOnce(new Error('decoder failed'));

    render(<EntryCard entry={playableVoiceEntry} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('entry-card'));
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '播放失败',
      message: '无法播放此音频，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });
});

describe('EntryCard long press behavior', () => {
  it('expands card on long press instead of showing action sheet', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EntryCard entry={longTextEntry} onDelete={jest.fn()} />
    );

    // 验证初始状态显示 "点击展开更多"
    expect(getByText('点击展开更多')).toBeTruthy();

    // 长按卡片
    fireEvent(getByTestId('entry-card'), 'longPress');

    // 验证卡片已展开（"点击展开更多" 消失）
    expect(queryByText('点击展开更多')).toBeNull();
  });

  it('does not show action sheet options on long press', () => {
    const { getByTestId, queryByText } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    // 长按卡片
    fireEvent(getByTestId('entry-card'), 'longPress');

    // 长按后不应该出现 ActionSheet 特有的选项文本（如 "取消"）
    expect(queryByText('取消')).toBeNull();
  });
});

describe('EntryCard photo edge-to-edge', () => {
  const photoEntry: Entry = {
    id: 'photo-1',
    type: 'photo',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'synced',
    media: [{
      uri: 'file://photo.jpg',
      mimeType: 'image/jpeg',
      size: 1000,
      metadata: { aspectRatio: 1.5, createdAt: Date.now(), modifiedAt: Date.now() },
    }],
  };

  const photoWithCaption: Entry = {
    ...photoEntry,
    id: 'photo-2',
    content: '今天拍的风景',
  };

  it('纯图片卡片：图片四角圆角为 10', () => {
    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image-0');
    expect(img.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 10 }),
      ])
    );
    // 验证 borderRadius 为 10，底部不被明确设为 0
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.borderRadius).toBe(10);
    expect(flatStyle.borderBottomLeftRadius).toBeUndefined();
    expect(flatStyle.borderBottomRightRadius).toBeUndefined();
  });

  it('有 caption 的图片卡片：图片底部圆角为 0', () => {
    render(<EntryCard entry={photoWithCaption} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image-0');
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.borderBottomLeftRadius).toBe(0);
    expect(flatStyle.borderBottomRightRadius).toBe(0);
  });

  it('仅有 tags 的图片卡片：图片底部圆角为 0', () => {
    const photoWithTagsOnly: Entry = {
      ...photoEntry,
      id: 'photo-tags-only',
      content: '',
      tags: ['风景'],
    };
    render(<EntryCard entry={photoWithTagsOnly} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image-0');
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.borderBottomLeftRadius).toBe(0);
    expect(flatStyle.borderBottomRightRadius).toBe(0);
  });

  it('有 tags 的图片卡片：tags 容器有水平内边距 14', () => {
    const photoWithTags: Entry = {
      ...photoEntry,
      id: 'photo-3',
      content: '',
      tags: ['风景', '旅行'],
    };
    render(<EntryCard entry={photoWithTags} onDelete={jest.fn()} />);
    // 验证 photo-tags-container 存在且有 paddingHorizontal: 14
    const tagsContainer = screen.getByTestId('photo-tags-container');
    const containerStyle = StyleSheet.flatten(tagsContainer.props.style);
    expect(containerStyle.paddingHorizontal).toBe(14);
  });

  it('文本卡片：tags 不使用 photo-tags-container', () => {
    const textWithTags: Entry = {
      id: 'text-1',
      type: 'text',
      content: '今天的事',
      timestamp: Date.now(),
      syncStatus: 'synced',
      tags: ['日记'],
    };
    render(<EntryCard entry={textWithTags} onDelete={jest.fn()} />);
    expect(screen.queryByTestId('photo-tags-container')).toBeNull();
  });

  describe('照片固定高度裁剪显示', () => {
    it('图片使用 resizeMode cover', () => {
      render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
      const img = screen.getByTestId('photo-image-0');
      expect(img.props.resizeMode).toBe('cover');
    });

    it('图片高度等于档位值（default=280）', () => {
      render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
      const img = screen.getByTestId('photo-image-0');
      const flatStyle = StyleSheet.flatten(img.props.style);
      expect(flatStyle.height).toBe(280);
    });

    it('compact 档位图片高度为 200', () => {
      jest.spyOn(require('@/src/store/settingsStore'), 'useSettingsStore').mockImplementation(
        (selector: (s: any) => any) => selector({ photoHeight: 'compact' })
      );
      render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
      const img = screen.getByTestId('photo-image-0');
      const flatStyle = StyleSheet.flatten(img.props.style);
      expect(flatStyle.height).toBe(200);
      jest.restoreAllMocks();
    });

    it('large 档位图片高度为 400', () => {
      jest.spyOn(require('@/src/store/settingsStore'), 'useSettingsStore').mockImplementation(
        (selector: (s: any) => any) => selector({ photoHeight: 'large' })
      );
      render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
      const img = screen.getByTestId('photo-image-0');
      const flatStyle = StyleSheet.flatten(img.props.style);
      expect(flatStyle.height).toBe(400);
      jest.restoreAllMocks();
    });

    it('photoMissing 高度等于档位值（default=280）', () => {
      // PhotoGrid 集成后，error 状态下 SinglePhoto 仍使用 testID="photo-image-0"
      const { getByTestId } = render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
      fireEvent(getByTestId('photo-image-0'), 'error');
      const missingView = getByTestId('photo-image-0');
      const flatStyle = StyleSheet.flatten(missingView.props.style);
      expect(flatStyle.height).toBe(280);
    });
  });

  it('普通多图卡片点击第二张图时应传第二张图片给 ImageViewer', () => {
    const multiPhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-multi-1',
      media: [
        { uri: 'file://photo-1.jpg', mimeType: 'image/jpeg', size: 1 },
        { uri: 'file://photo-2.jpg', mimeType: 'image/jpeg', size: 1 },
        { uri: 'file://photo-3.jpg', mimeType: 'image/jpeg', size: 1 },
      ],
    };

    const { getByTestId } = render(<EntryCard entry={multiPhotoEntry} onDelete={jest.fn()} />);
    fireEvent.press(getByTestId('photo-cell-1'));

    expect(getByTestId('image-viewer-uri').props.children).toBe('file://photo-2.jpg');
  });

  it('图片查看器应复用照片 URI 归一化结果', () => {
    const { PhotoService } = require('@/src/services/photoService');
    const resolveSpy = jest
      .spyOn(PhotoService, 'resolvePhotoUri')
      .mockImplementation((uri: string) => `resolved:${uri}`);

    const localPhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-local-1',
      media: [
        { uri: 'file://viewer-local-1.jpg', mimeType: 'image/jpeg', size: 1 },
      ],
    };

    const { getByTestId } = render(<EntryCard entry={localPhotoEntry} onDelete={jest.fn()} />);
    fireEvent.press(getByTestId('photo-image-0'));

    expect(resolveSpy).toHaveBeenCalledWith('file://viewer-local-1.jpg');
    expect(getByTestId('image-viewer-uri').props.children).toBe('resolved:file://viewer-local-1.jpg');

    resolveSpy.mockRestore();
  });

  it('图片查看器在旧本地路径失效时应回退到远端大图地址', () => {
    const staleLocalPhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-stale-local-1',
      media: [
        {
          uri: 'file:///stale/photo.jpg',
          remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
          mimeType: 'image/jpeg',
          size: 1,
        },
      ],
    };

    const { getByTestId } = render(<EntryCard entry={staleLocalPhotoEntry} onDelete={jest.fn()} />);
    fireEvent.press(getByTestId('photo-image-0'));

    expect(getByTestId('image-viewer-uri').props.children).toBe(
      'http://101.43.120.134:8081/api/media/photo-1'
    );
  });

  it('远端图片尚未落地时点击卡片不应打开图片查看器', () => {
    const pendingRemotePhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-remote-pending-1',
      media: [
        {
          uri: 'http://101.43.120.134:8081/api/media/pending-1',
          remoteUri: 'http://101.43.120.134:8081/api/media/pending-1',
          remoteThumbnail: 'http://101.43.120.134:8081/api/media/pending-1-thumb',
          mimeType: 'image/jpeg',
          size: 1,
        },
      ],
    };

    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={pendingRemotePhotoEntry} onDelete={jest.fn()} />
    );
    fireEvent.press(getByTestId('entry-card'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('图片缺少本地与远端可打开资源时点击卡片不应挂载图片查看器', () => {
    const unavailablePhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-no-viewer-target-1',
      media: [
        {
          uri: '',
          remoteUri: '',
          remoteThumbnail: '',
          thumbnail: '',
          mimeType: 'image/jpeg',
          size: 1,
        },
      ],
    };

    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={unavailablePhotoEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('照片只有缩略图资源时点击卡片不应挂载图片查看器', () => {
    const thumbnailOnlyPhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-thumbnail-only-1',
      media: [
        {
          uri: '',
          remoteUri: '',
          thumbnail: 'file:///viewer-thumb-only.jpg',
          remoteThumbnail: '',
          mimeType: 'image/jpeg',
          size: 1,
        },
      ],
    };

    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={thumbnailOnlyPhotoEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('打开图片查看器时应该打印选中媒体与最终路径日志', () => {
    const loggingPhotoEntry: Entry = {
      ...photoEntry,
      id: 'photo-log-open-1',
      media: [
        {
          uri: 'file:///stale/photo.jpg',
          remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
          mimeType: 'image/jpeg',
          size: 1,
        },
      ],
    };

    const { getByTestId } = render(<EntryCard entry={loggingPhotoEntry} onDelete={jest.fn()} />);
    fireEvent.press(getByTestId('photo-image-0'));

    expect(logger.log).toHaveBeenCalledWith(
      '[EntryCardDialogs] opening image viewer',
      expect.objectContaining({
        entryId: 'photo-log-open-1',
        selectedImageIndex: 0,
        preferredViewerUri: 'http://101.43.120.134:8081/api/media/photo-1',
      }),
    );
  });
});

describe('EntryCard calendar variant', () => {
  const calendarPhotoSingle: Entry = {
    id: 'calendar-photo-single',
    type: 'photo',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'synced',
    media: [{
      uri: 'file://calendar-single.jpg',
      mimeType: 'image/jpeg',
      size: 1200,
      metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
    }],
  };

  const calendarPhotoMulti: Entry = {
    id: 'calendar-photo-multi',
    type: 'photo',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'synced',
    media: [
      {
        uri: 'file://calendar-multi-1.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
      },
      {
        uri: 'file://calendar-multi-2.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
      },
      {
        uri: 'file://calendar-multi-3.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
      },
      {
        uri: 'file://calendar-multi-4.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
      },
    ],
  };

  const calendarPhotoDouble: Entry = {
    id: 'calendar-photo-double',
    type: 'photo',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'synced',
    media: [
      {
        uri: 'file://calendar-double-1.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
      },
      {
        uri: 'file://calendar-double-2.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
      },
    ],
  };

  const calendarVoice: Entry = {
    id: 'calendar-voice',
    type: 'voice',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'synced',
    media: [{
      uri: 'file://calendar-voice.m4a',
      mimeType: 'audio/m4a',
      size: 2048,
      duration: 120000,
      metadata: { createdAt: Date.now(), modifiedAt: Date.now() },
    }],
    transcription: {
      text: '语音转录内容',
      language: 'zh-CN',
      confidence: 0.98,
      model: 'local',
      duration: 200,
    },
  };

  it('calendar 单图照片使用单图布局', () => {
    render(
      <EntryCard
        entry={calendarPhotoSingle}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-photo-card-layout-single-calendar-photo-single')).toBeTruthy();
    expect(screen.getByTestId('calendar-card-shell-calendar-photo-single')).toBeTruthy();
  });

  it('calendar 多图照片使用主图加侧露结构布局', () => {
    render(
      <EntryCard
        entry={calendarPhotoMulti}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-photo-card-layout-multi-calendar-photo-multi')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('calendar 双图照片使用左右对半布局而不是三图模板', () => {
    render(
      <EntryCard
        entry={calendarPhotoDouble}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-photo-card-layout-double-calendar-photo-double')).toBeTruthy();
    expect(screen.getByTestId('calendar-photo-double-primary-calendar-photo-double')).toBeTruthy();
    expect(screen.getByTestId('calendar-photo-double-secondary-calendar-photo-double')).toBeTruthy();
    expect(screen.queryByTestId('calendar-photo-card-layout-multi-calendar-photo-double')).toBeNull();
  });

  it('calendar 双图照片的间距和内侧圆角与 PhotoGrid 保持一致', () => {
    render(
      <EntryCard
        entry={calendarPhotoDouble}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    const wrapStyle = screen.getByTestId('calendar-photo-card-layout-double-calendar-photo-double').props.style;
    const primaryStyle = screen.getByTestId('calendar-photo-double-primary-calendar-photo-double').props.style;
    const secondaryStyle = screen.getByTestId('calendar-photo-double-secondary-calendar-photo-double').props.style;

    const flatWrapStyle = Array.isArray(wrapStyle) ? Object.assign({}, ...wrapStyle) : wrapStyle;
    const flatPrimaryStyle = Array.isArray(primaryStyle) ? Object.assign({}, ...primaryStyle) : primaryStyle;
    const flatSecondaryStyle = Array.isArray(secondaryStyle) ? Object.assign({}, ...secondaryStyle) : secondaryStyle;

    expect(flatWrapStyle.gap).toBe(3);
    expect(flatPrimaryStyle.borderTopRightRadius).toBe(0);
    expect(flatPrimaryStyle.borderBottomRightRadius).toBe(0);
    expect(flatSecondaryStyle.borderTopLeftRadius).toBe(0);
    expect(flatSecondaryStyle.borderBottomLeftRadius).toBe(0);
  });

  it('calendar 照片卡片让图片贴边并仅为 meta 区保留内边距', () => {
    render(
      <EntryCard
        entry={{
          ...calendarPhotoDouble,
          content: '双图说明文案',
          tags: ['旅行'],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    const photoCardStyle = screen.getByTestId('calendar-photo-card-root').props.style;
    const metaStyle = screen.getByTestId('calendar-photo-meta').props.style;

    const flatPhotoCardStyle = Array.isArray(photoCardStyle) ? Object.assign({}, ...photoCardStyle) : photoCardStyle;
    const flatMetaStyle = Array.isArray(metaStyle) ? Object.assign({}, ...metaStyle) : metaStyle;

    expect(flatPhotoCardStyle.padding).toBe(0);
    expect(flatMetaStyle.paddingHorizontal).toBeGreaterThan(0);
    expect(flatMetaStyle.paddingTop).toBeGreaterThan(0);
  });

  it('calendar 贴边照片卡片将数量角标内缩到更贴近图片边缘的位置', () => {
    render(
      <EntryCard
        entry={calendarPhotoDouble}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    const overlayStyle = screen.getByTestId('calendar-photo-count-overlay').props.style;
    const flatOverlayStyle = Array.isArray(overlayStyle) ? Object.assign({}, ...overlayStyle) : overlayStyle;

    expect(flatOverlayStyle.right).toBe(6);
    expect(flatOverlayStyle.bottom).toBe(6);
  });

  it('calendar 多图卡片点击第三张图时应传第三张图片给 ImageViewer', () => {
    const { getByTestId } = render(
      <EntryCard
        entry={calendarPhotoMulti}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId(`calendar-photo-secondary-cell-2-${calendarPhotoMulti.id}`));

    expect(getByTestId('image-viewer-uri').props.children).toBe('file://calendar-multi-3.jpg');
  });

  it('calendar 多图右侧第一格只有缩略图资源时点击不应挂载图片查看器', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={{
          ...calendarPhotoMulti,
          id: 'calendar-photo-multi-thumbnail-only-secondary-1',
          media: [
            calendarPhotoMulti.media![0],
            {
              uri: '',
              remoteUri: '',
              thumbnail: 'file:///calendar-multi-thumb-only-2.jpg',
              remoteThumbnail: '',
              mimeType: 'image/jpeg',
              size: 1200,
              metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
            },
            calendarPhotoMulti.media![2],
            calendarPhotoMulti.media![3],
          ],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId('calendar-photo-secondary-cell-1-calendar-photo-multi-thumbnail-only-secondary-1'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('calendar 多图右侧第二格只有缩略图资源时点击不应挂载图片查看器', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={{
          ...calendarPhotoMulti,
          id: 'calendar-photo-multi-thumbnail-only-secondary-2',
          media: [
            calendarPhotoMulti.media![0],
            calendarPhotoMulti.media![1],
            {
              uri: '',
              remoteUri: '',
              thumbnail: 'file:///calendar-multi-thumb-only-3.jpg',
              remoteThumbnail: '',
              mimeType: 'image/jpeg',
              size: 1200,
              metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
            },
            calendarPhotoMulti.media![3],
          ],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId('calendar-photo-secondary-cell-2-calendar-photo-multi-thumbnail-only-secondary-2'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('calendar 多图主图只有缩略图资源时点击不应挂载图片查看器', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={{
          ...calendarPhotoMulti,
          id: 'calendar-photo-multi-thumbnail-only-primary',
          media: [
            {
              uri: '',
              remoteUri: '',
              thumbnail: 'file:///calendar-multi-thumb-only-1.jpg',
              remoteThumbnail: '',
              mimeType: 'image/jpeg',
              size: 1200,
              metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
            },
            calendarPhotoMulti.media![1],
            calendarPhotoMulti.media![2],
            calendarPhotoMulti.media![3],
          ],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId('calendar-photo-primary-calendar-photo-multi-thumbnail-only-primary'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('calendar 无照片资源时展示专用空状态', () => {
    render(
      <EntryCard
        entry={{
          ...calendarPhotoSingle,
          id: 'calendar-photo-empty',
          media: [],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-card-shell-calendar-photo-empty')).toBeTruthy();
  });

  it('calendar 单图只有缩略图资源时点击不应挂载图片查看器', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={{
          ...calendarPhotoSingle,
          id: 'calendar-photo-thumbnail-only',
          media: [{
            uri: '',
            remoteUri: '',
            thumbnail: 'file:///calendar-thumb-only.jpg',
            remoteThumbnail: '',
            mimeType: 'image/jpeg',
            size: 1200,
            metadata: { aspectRatio: 0.75, createdAt: Date.now(), modifiedAt: Date.now() },
          }],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId('calendar-photo-primary-calendar-photo-thumbnail-only'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('calendar 双图副图只有缩略图资源时点击不应挂载图片查看器', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={{
          ...calendarPhotoDouble,
          id: 'calendar-photo-double-thumbnail-only-secondary',
          media: [
            calendarPhotoDouble.media![0],
            {
              uri: '',
              remoteUri: '',
              thumbnail: 'file:///calendar-double-thumb-only.jpg',
              remoteThumbnail: '',
              mimeType: 'image/jpeg',
              size: 1200,
              metadata: { aspectRatio: 0.9, createdAt: Date.now(), modifiedAt: Date.now() },
            },
          ],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId('calendar-photo-double-secondary-calendar-photo-double-thumbnail-only-secondary'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('calendar 双图主图只有缩略图资源时点击不应挂载图片查看器', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={{
          ...calendarPhotoDouble,
          id: 'calendar-photo-double-thumbnail-only-primary',
          media: [
            {
              uri: '',
              remoteUri: '',
              thumbnail: 'file:///calendar-double-primary-thumb-only.jpg',
              remoteThumbnail: '',
              mimeType: 'image/jpeg',
              size: 1200,
              metadata: { aspectRatio: 0.9, createdAt: Date.now(), modifiedAt: Date.now() },
            },
            calendarPhotoDouble.media![1],
          ],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    fireEvent.press(getByTestId('calendar-photo-double-primary-calendar-photo-double-thumbnail-only-primary'));

    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('calendar 语音卡暴露播放按钮测试标记', () => {
    render(
      <EntryCard
        entry={calendarVoice}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-card-shell-calendar-voice')).toBeTruthy();
    expect(screen.getByTestId('calendar-voice-play-button-calendar-voice')).toBeTruthy();
    expect(screen.getAllByText('语音转录内容').length).toBeGreaterThan(0);
  });

  it('calendar 文本卡使用专用文案层级', () => {
    render(
      <EntryCard
        entry={{
          id: 'calendar-text',
          type: 'text',
          content: '不是旧卡片的缩小版，而是日历里的记忆便签。',
          timestamp: Date.now(),
          syncStatus: 'synced',
          tags: ['想法', '记录'],
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-card-shell-calendar-text')).toBeTruthy();
    expect(screen.getByText('不是旧卡片的缩小版，而是日历里的记忆便签。')).toBeTruthy();
    expect(screen.getByText('#想法')).toBeTruthy();
  });

  it('calendar 录音中语音卡暴露录音状态测试标记', () => {
    render(
      <EntryCard
        entry={{
          ...calendarVoice,
          id: 'calendar-recording',
          recordingStatus: 'recording',
          recordingDuration: 8,
          transcription: undefined,
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-recording-status-calendar-recording')).toBeTruthy();
  });

  it('calendar stopping 语音卡显示处理中状态', () => {
    render(
      <EntryCard
        entry={{
          ...calendarVoice,
          id: 'calendar-stopping',
          recordingStatus: 'stopping',
          recordingDuration: 8,
          transcription: undefined,
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-recording-status-calendar-stopping')).toBeTruthy();
    expect(screen.getByText('处理中...')).toBeTruthy();
  });

  it('calendar 语音媒体缺失时显示明确提示而不是空白卡片', () => {
    render(
      <EntryCard
        entry={{
          ...calendarVoice,
          id: 'calendar-voice-missing-media',
          media: [],
          transcription: undefined,
        }}
        onDelete={jest.fn()}
        variant="calendar"
      />
    );

    expect(screen.getByTestId('calendar-card-shell-calendar-voice-missing-media')).toBeTruthy();
    expect(screen.getByText('音频文件已丢失')).toBeTruthy();
  });
});
