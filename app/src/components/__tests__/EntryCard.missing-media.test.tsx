/**
 * EntryCard — 媒体文件丢失行为测试
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockCurrentPlayingId: string | null = null;
const mockSetCurrentPlayingId = jest.fn((id: string | null) => {
  mockCurrentPlayingId = id;
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    currentPlayingId: mockCurrentPlayingId,
    setCurrentPlayingId: mockSetCurrentPlayingId,
  }),
}));

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: (selector: (s: any) => any) => selector({ photoHeight: 'default' }),
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { stopPlayback: jest.fn(), playAudio: jest.fn() },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: { resolvePhotoUri: (uri: string) => uri },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/src/services/showAppDialog', () => ({
  showAppDialog: jest.fn(),
}));

jest.mock('../WaveformAnimation', () => 'WaveformAnimation');
jest.mock('../ImageViewer', () => {
  const { View } = require('react-native');
  return {
    ImageViewer: ({ visible }: { visible: boolean; originLayout?: unknown; thumbnailRef?: unknown }) =>
      visible ? <View testID="image-viewer" /> : null,
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
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
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

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Swipeable = React.forwardRef(({ children, onSwipeableOpen, onSwipeableWillOpen, ...props }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    return (
      <View
        testID="swipeable"
        onSwipeableOpen={onSwipeableOpen}
        onSwipeableWillOpen={onSwipeableWillOpen}
        {...props}
      >
        {children}
      </View>
    );
  });

  Swipeable.displayName = 'Swipeable';

  return { Swipeable };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system';
import { showAppDialog } from '@/src/services/showAppDialog';
import { VoiceService } from '@/src/services/voiceService';
import { EntryCard } from '../EntryCard';
import { Entry } from '@/src/types/entry';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const photoEntry: Entry = {
  id: 'p1',
  type: 'photo',
  content: '说明文字',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
  media: [{ uri: 'file:///missing.jpg', mimeType: 'image/jpeg', size: 0 }],
};

const voiceEntry: Entry = {
  id: 'v1',
  type: 'voice',
  content: '',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
  media: [{ uri: 'file:///missing.m4a', mimeType: 'audio/m4a', size: 0, duration: 3000 }],
};

const voiceEntryWithEmptyMedia: Entry = {
  id: 'v2',
  type: 'voice',
  content: '',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
  media: [],
};

const textEntry: Entry = {
  id: 't1',
  type: 'text',
  content: '一条普通文本记录',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
};

const PHOTO_CARD_BG = '#CCE9EF';
const PHOTO_CARD_BG_PRESSED = '#BDDEE5';
const PHOTO_IMAGE_BG = '#ECE7E0';

const longTextEntry: Entry = {
  id: 't2',
  type: 'text',
  content: '这是一条很长的文本记录，'.repeat(12),
  tags: ['标签1', '标签2', '标签3', '标签4'],
  timestamp: 1700000000000,
  syncStatus: 'synced',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EntryCard — 媒体文件丢失', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentPlayingId = null;
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
  });

  // ── 图片丢失 ──────────────────────────────────────────────────────────────

  it('图片丢失时点击卡片仍应打开 ImageViewer', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    // 模拟图片加载失败
    fireEvent(getByTestId('photo-image-0'), 'error');

    // 点击卡片
    fireEvent.press(getByTestId('entry-card'));

    expect(queryByTestId('image-viewer')).toBeTruthy();
  });

  it('图片正常时点击卡片应打开 ImageViewer', () => {
    const { getByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    // 不触发 onError，直接点击
    fireEvent.press(getByTestId('entry-card'));

    expect(getByTestId('image-viewer')).toBeTruthy();
  });

  it('图片卡片默认应使用统一后的中性背景', () => {
    const { getByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    expect(getByTestId('entry-card')).toHaveStyle({
      backgroundColor: PHOTO_CARD_BG,
    });
  });

  it('图片卡片按下时应切换到更深一档的中性背景', () => {
    const { getByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    fireEvent(getByTestId('entry-card'), 'pressIn');
    expect(getByTestId('entry-card')).toHaveStyle({
      backgroundColor: PHOTO_CARD_BG_PRESSED,
    });

    fireEvent(getByTestId('entry-card'), 'pressOut');
    expect(getByTestId('entry-card')).toHaveStyle({
      backgroundColor: PHOTO_CARD_BG,
    });
  });

  it('图片区域默认背景应使用统一的中性浅灰', () => {
    const { getByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    expect(getByTestId('photo-image-0')).toHaveStyle({
      backgroundColor: PHOTO_IMAGE_BG,
    });
  });

  // ── 音频丢失 ──────────────────────────────────────────────────────────────

  it('语音卡片渲染时不应预检音频文件是否存在', () => {
    render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  it('音频文件不存在时点击播放后应显示"音频文件已丢失"提示', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const { findByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));

    expect(await findByText('音频文件已丢失')).toBeTruthy();
    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '文件不存在',
        message: '音频文件已丢失或被删除，无法播放。',
        tone: 'error',
        blocking: true,
      })
    );
  });

  it('音频丢失时点击卡片不应触发播放', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const { findByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));
    await findByText('音频文件已丢失');

    expect(VoiceService.playAudio).not.toHaveBeenCalled();
  });

  it('音频文件存在时不应显示丢失提示', async () => {
    const { queryByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));

    await waitFor(() => {
      expect(queryByText('音频文件已丢失')).toBeNull();
    });
  });

  it('播放失败时应显示自定义错误对话框', async () => {
    (VoiceService.playAudio as jest.Mock).mockRejectedValueOnce(new Error('decode failed'));

    const { getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));

    await waitFor(() => {
      expect(showAppDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '播放失败',
          message: '无法播放此音频，请重试',
          tone: 'error',
          blocking: true,
        })
      );
    });
  });

  it('语音卡片应显示首个媒体项的时长', () => {
    const { getByText } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    expect(getByText('00:03')).toBeTruthy();
  });

  it('语音记录的 media 为空数组时不应渲染语音播放器', () => {
    const { queryByText } = render(
      <EntryCard entry={voiceEntryWithEmptyMedia} onDelete={jest.fn()} />
    );

    expect(queryByText('00:00')).toBeNull();
  });

  it('长按卡片时应展开内容且不显示旧的 ActionSheet 时间文案', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EntryCard entry={longTextEntry} onDelete={jest.fn()} />
    );

    const content = getByText(longTextEntry.content);
    expect(content.props.numberOfLines).toBe(4);
    expect(getByText('点击展开更多')).toBeTruthy();

    fireEvent(getByTestId('entry-card'), 'longPress');

    expect(content.props.numberOfLines).toBeUndefined();
    expect(queryByText('点击展开更多')).toBeNull();
    expect(
      queryByText(
        new Date(longTextEntry.timestamp).toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    ).toBeNull();
  });

  it('用 Swipeable 包裹卡片内容并在滑动打开后显示底部操作面板', () => {
    jest.useFakeTimers();

    const onActionSheetOpen = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <EntryCard
        entry={textEntry}
        onDelete={jest.fn()}
        onActionSheetOpen={onActionSheetOpen}
      />
    );

    const swipeable = getByTestId('swipeable');

    expect(swipeable).toBeTruthy();
    expect(getByTestId('entry-card')).toBeTruthy();
    expect(swipeable.props.friction).toBe(1.2);
    expect(swipeable.props.leftThreshold).toBe(40);
    expect(swipeable.props.rightThreshold).toBe(24);
    expect(swipeable.props.overshootRight).toBe(false);
    expect(swipeable.props.dragOffsetFromRightEdge).toBe(10);
    expect(typeof swipeable.props.renderRightActions).toBe('function');

    act(() => {
      swipeable.props.onSwipeableOpen('right');
    });

    expect(queryByTestId('entry-action-sheet')).toBeNull();
    expect(onActionSheetOpen).toHaveBeenCalledWith(textEntry.id);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByTestId('entry-action-sheet')).toBeTruthy();
    jest.useRealTimers();
  });

  it('图片丢失时左滑后仍应显示底部操作面板', () => {
    jest.useFakeTimers();

    const onDelete = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={onDelete} />
    );

    // 模拟图片加载失败
    fireEvent(getByTestId('photo-image-0'), 'error');

    expect(queryByTestId('entry-action-sheet')).toBeNull();
    expect(getByTestId('swipeable')).toBeTruthy();

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });

    expect(queryByTestId('entry-action-sheet')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByTestId('entry-action-sheet')).toBeTruthy();
    expect(getByTestId('action-sheet-edit')).toBeTruthy();
    expect(getByTestId('action-sheet-delete')).toBeTruthy();
    jest.useRealTimers();
  });

  it('音频丢失时左滑后仍应显示底部操作面板', async () => {
    jest.useFakeTimers();

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const onDelete = jest.fn();
    const { findByText, getByTestId, queryByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={onDelete} />
    );

    fireEvent.press(getByTestId('entry-card'));
    await findByText('音频文件已丢失');

    expect(queryByTestId('entry-action-sheet')).toBeNull();
    expect(getByTestId('swipeable')).toBeTruthy();

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });

    expect(queryByTestId('entry-action-sheet')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByTestId('entry-action-sheet')).toBeTruthy();
    expect(getByTestId('action-sheet-edit')).toBeTruthy();
    expect(getByTestId('action-sheet-delete')).toBeTruthy();
    jest.useRealTimers();
  });
});
