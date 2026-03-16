/**
 * EntryCard — 媒体文件丢失行为测试
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({ currentPlayingId: null, setCurrentPlayingId: jest.fn() }),
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

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Swipeable = React.forwardRef(({ children, renderRightActions, ...props }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    return (
      <View testID="swipeable" {...props}>
        {children}
        {renderRightActions?.(
          { interpolate: () => 0 } as any,
          { interpolate: () => 0 } as any
        )}
      </View>
    );
  });

  Swipeable.displayName = 'Swipeable';

  return { Swipeable };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system';
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
  media: { uri: 'file:///missing.jpg', mimeType: 'image/jpeg', size: 0 },
};

const voiceEntry: Entry = {
  id: 'v1',
  type: 'voice',
  content: '',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
  media: { uri: 'file:///missing.m4a', mimeType: 'audio/m4a', size: 0, duration: 3000 },
};

const textEntry: Entry = {
  id: 't1',
  type: 'text',
  content: '一条普通文本记录',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
};

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
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
  });

  // ── 图片丢失 ──────────────────────────────────────────────────────────────

  it('图片丢失时点击卡片不应打开 ImageViewer', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    // 模拟图片加载失败
    fireEvent(getByTestId('photo-image'), 'error');

    // 点击卡片
    fireEvent.press(getByTestId('entry-card'));

    // ImageViewer 不应出现
    expect(queryByTestId('image-viewer')).toBeNull();
  });

  it('图片正常时点击卡片应打开 ImageViewer', () => {
    const { getByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    // 不触发 onError，直接点击
    fireEvent.press(getByTestId('entry-card'));

    expect(getByTestId('image-viewer')).toBeTruthy();
  });

  // ── 音频丢失 ──────────────────────────────────────────────────────────────

  it('音频文件不存在时应显示"音频文件已丢失"提示', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const { findByText } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    expect(await findByText('音频文件已丢失')).toBeTruthy();
  });

  it('音频丢失时点击卡片不应触发播放', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const { findByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    await findByText('音频文件已丢失');
    fireEvent.press(getByTestId('entry-card'));

    expect(VoiceService.playAudio).not.toHaveBeenCalled();
  });

  it('音频文件存在时不应显示丢失提示', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });

    const { queryByText } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    await waitFor(() => {
      expect(queryByText('音频文件已丢失')).toBeNull();
    });
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

  it('用 Swipeable 包裹卡片内容并透传滑动回调', () => {
    const onSwipeStart = jest.fn();
    const onSwipeClose = jest.fn();
    const { getByTestId } = render(
      <EntryCard
        entry={textEntry}
        onDelete={jest.fn()}
        onSwipeStart={onSwipeStart}
        onSwipeClose={onSwipeClose}
      />
    );

    const swipeable = getByTestId('swipeable');

    expect(swipeable).toBeTruthy();
    expect(getByTestId('entry-card')).toBeTruthy();
    expect(swipeable.props.friction).toBe(2);
    expect(swipeable.props.leftThreshold).toBe(40);
    expect(swipeable.props.rightThreshold).toBe(40);
    expect(swipeable.props.overshootRight).toBe(false);
    expect(swipeable.props.dragOffsetFromRightEdge).toBe(10);

    swipeable.props.onSwipeableWillOpen();
    expect(onSwipeStart).toHaveBeenCalledWith(textEntry.id);

    swipeable.props.onSwipeableWillClose();
    expect(onSwipeClose).toHaveBeenCalled();
  });

  it('图片丢失时滑动按钮应正确渲染', () => {
    const onDelete = jest.fn();
    const { getByTestId, getByText } = render(
      <EntryCard entry={photoEntry} onDelete={onDelete} />
    );

    // 模拟图片加载失败
    fireEvent(getByTestId('photo-image'), 'error');

    // Swipeable 应该渲染
    expect(getByTestId('swipeable')).toBeTruthy();

    // 滑动按钮（编辑和删除）应该存在
    expect(getByText('编辑')).toBeTruthy();
    expect(getByText('删除')).toBeTruthy();
  });

  it('音频丢失时滑动按钮应正确渲染', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const onDelete = jest.fn();
    const { findByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={onDelete} />
    );

    // 等待音频丢失提示出现
    await findByText('音频文件已丢失');

    // Swipeable 应该渲染
    expect(getByTestId('swipeable')).toBeTruthy();

    // 滑动按钮（编辑和删除）应该存在
    expect(getByTestId('swipeable').children.length).toBeGreaterThan(0);
  });
});
