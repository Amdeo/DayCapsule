/**
 * EntryCard — 媒体文件丢失行为测试
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
  useSettingsStore: (selector: (s: any) => any) => selector({ photoHeight: 'default' }),
  PHOTO_HEIGHT_VALUES: { compact: 200, default: 280, large: 400 },
}));

jest.mock('@/src/services/voiceService', () => ({
  VoiceService: { stopPlayback: jest.fn(), playAudio: jest.fn() },
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    resolvePhotoUri: (uri: string) => uri,
    getPreferredPhotoUri: (media: any, kind: 'thumbnail' | 'full') => {
      const candidates = kind === 'thumbnail'
        ? [media.thumbnail, media.remoteThumbnail, media.remoteUri, media.uri]
        : [media.remoteUri, media.uri];
      return candidates.find((uri) => typeof uri === 'string' && uri.length > 0) ?? '';
    },
    getFallbackPhotoUri: (media: any, failedUri: string, kind: 'thumbnail' | 'full') => {
      const candidates = (kind === 'thumbnail'
        ? [media.thumbnail, media.remoteThumbnail, media.remoteUri, media.uri]
        : [media.remoteUri, media.uri]
      ).filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
      const failedIndex = candidates.findIndex((uri) => uri === failedUri);
      return failedIndex >= 0 ? candidates[failedIndex + 1] ?? null : candidates[0] ?? null;
    },
  },
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
import { VoiceService } from '@/src/services/voiceService';
import { Alert } from 'react-native';
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EntryCard — 媒体文件丢失', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    await act(async () => {
      fireEvent.press(getByTestId('entry-card'));
    });

    expect(await findByText('音频文件已丢失')).toBeTruthy();
  });

  it('音频丢失时点击卡片不应触发播放', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const { findByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('entry-card'));
    });
    await findByText('音频文件已丢失');

    expect(VoiceService.playAudio).not.toHaveBeenCalled();
  });

  it('音频文件存在时不应显示丢失提示', async () => {
    const { queryByText, getByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('entry-card'));
    });

    await waitFor(() => {
      expect(queryByText('音频文件已丢失')).toBeNull();
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
});
