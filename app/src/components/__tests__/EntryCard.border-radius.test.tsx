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
    ImageViewer: ({ visible }: { visible: boolean }) => (visible ? <View testID="image-viewer" /> : null),
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
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../EntryActionSheet', () => ({
  EntryActionSheet: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Swipeable = React.forwardRef(({ children }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    return <View testID="swipeable">{children}</View>;
  });

  Swipeable.displayName = 'Swipeable';

  return { Swipeable };
});

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { EntryCard } from '../EntryCard';
import { Entry } from '@/src/types/entry';

const textEntry: Entry = {
  id: 'style-1',
  type: 'text',
  content: '样式回归测试',
  tags: [],
  timestamp: 1700000000000,
  syncStatus: 'synced',
};

describe('EntryCard border radius', () => {
  it('uses 10px radius for both the outer shell and inner card container', () => {
    const { getByTestId } = render(
      <EntryCard entry={textEntry} onDelete={jest.fn()} />
    );

    expect(getByTestId('entry-card-container')).toHaveStyle({ borderRadius: 10 });
    expect(getByTestId('entry-card')).toHaveStyle({ borderRadius: 10 });

    const outerStyle = StyleSheet.flatten(getByTestId('entry-card-container').props.style);
    const innerStyle = StyleSheet.flatten(getByTestId('entry-card').props.style);

    expect(outerStyle.borderRadius).toBe(10);
    expect(innerStyle.borderRadius).toBe(10);
  });
});
