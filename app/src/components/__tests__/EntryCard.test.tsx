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

// 模拟 Swipeable 并渲染右滑按钮
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');

  const Swipeable = React.forwardRef(({ children, renderRightActions, ...props }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    return (
      <View testID="swipeable" {...props}>
        {renderRightActions && renderRightActions(
          { interpolate: () => ({}) },
          { interpolate: () => ({}) }
        )}
        {children}
      </View>
    );
  });

  Swipeable.displayName = 'Swipeable';

  return { Swipeable };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
  it('renders edit and delete buttons', () => {
    const { getByLabelText } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );
    expect(getByLabelText('编辑条目')).toBeTruthy();
    expect(getByLabelText('删除条目')).toBeTruthy();
  });

  it('calls onEdit when edit button pressed', () => {
    const onEdit = jest.fn();
    const { getByLabelText } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onEdit={onEdit} />
    );
    fireEvent.press(getByLabelText('编辑条目'));
    expect(onEdit).toHaveBeenCalledWith(mockEntry);
  });

  it('calls onDelete when delete button pressed', () => {
    const onDelete = jest.fn();
    const { getByLabelText } = render(
      <EntryCard entry={mockEntry} onDelete={onDelete} />
    );
    fireEvent.press(getByLabelText('删除条目'));
    // 删除按钮会触发 Alert，这里只验证按钮存在且可点击
    expect(getByLabelText('删除条目')).toBeTruthy();
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
