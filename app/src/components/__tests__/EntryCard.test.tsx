/**
 * EntryCard — 滑动操作测试
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
import { render, fireEvent, act } from '@testing-library/react-native';
import * as ReanimatedModule from 'react-native-reanimated';
import { EntryCard } from '../EntryCard';
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
    jest.useRealTimers();
  });

  it('does not show action sheet by default', () => {
    const { queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );

    expect(queryByTestId('entry-action-sheet')).toBeNull();
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

  it('also triggers the delayed action sheet from onSwipeableWillOpen', () => {
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

  it('marks the card active immediately when swipe trigger starts', () => {
    const onActionSheetOpen = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onActionSheetOpen={onActionSheetOpen} />
    );

    act(() => {
      getByTestId('swipeable').props.onSwipeableWillOpen('right');
    });

    expect(onActionSheetOpen).toHaveBeenCalledWith(mockEntry.id);
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
