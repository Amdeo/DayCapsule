/**
 * EntryCard — 缺媒体/变体交互矩阵
 */

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

jest.mock('../../WaveformAnimation', () => 'WaveformAnimation');
jest.mock('../../ImageViewer', () => {
  const { View } = require('react-native');
  return {
    ImageViewer: ({ visible }: { visible: boolean }) =>
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
  const Image = mockComponent('../Libraries/Image/Image', {}, true);

  return {
    __esModule: true,
    default: Image,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../EntryActionSheet', () => {
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

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system';
import { EntryCard } from '../../EntryCard';
import { Entry } from '@/src/types/entry';

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

describe('EntryCard missing media variants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('expands long text content on long press without showing legacy timestamp copy', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EntryCard entry={longTextEntry} onDelete={jest.fn()} />
    );

    const content = getByText(longTextEntry.content);
    expect(content.props.numberOfLines).toBe(4);

    fireEvent(getByTestId('entry-card'), 'longPress');

    expect(content.props.numberOfLines).toBeUndefined();
    expect(queryByText('点击展开更多')).toBeNull();
  });

  it('shows the swipe action sheet for a text card', () => {
    jest.useFakeTimers();

    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={textEntry} onDelete={jest.fn()} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });

    expect(queryByTestId('entry-action-sheet')).toBeTruthy();
    jest.useRealTimers();
  });

  it('keeps swipe actions available after a missing photo falls back to placeholder', () => {
    jest.useFakeTimers();

    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={photoEntry} onDelete={jest.fn()} />
    );

    fireEvent(getByTestId('photo-image-0'), 'error');

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });

    expect(queryByTestId('entry-action-sheet')).toBeTruthy();
    jest.useRealTimers();
  });

  it('keeps swipe actions available after a missing audio alert path', async () => {
    jest.useFakeTimers();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    const { findByText, getByTestId, queryByTestId } = render(
      <EntryCard entry={voiceEntry} onDelete={jest.fn()} />
    );

    fireEvent.press(getByTestId('entry-card'));
    await findByText('音频文件已丢失');

    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
      jest.advanceTimersByTime(100);
    });

    expect(queryByTestId('entry-action-sheet')).toBeTruthy();
    jest.useRealTimers();
  });
});
