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

jest.mock('../../EntryActionSheet', () => ({
  EntryActionSheet: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Swipeable = React.forwardRef(({ children, ...props }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    return (
      <View testID="swipeable" {...props}>
        {children}
      </View>
    );
  });

  Swipeable.displayName = 'Swipeable';

  return { Swipeable };
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EntryCard } from '../../EntryCard';
import type { Entry, MediaInfo } from '@/src/types/entry';

function createPhotoEntry(media: MediaInfo): Entry {
  return {
    id: 'photo-variant',
    type: 'photo',
    content: '说明文字',
    tags: ['旅行'],
    timestamp: 1700000000000,
    syncStatus: 'synced',
    media: [media],
  };
}

describe('EntryCard missing media variants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a stable placeholder when the photo source is already missing', () => {
    const entry = createPhotoEntry({
      uri: '',
      mimeType: 'image/jpeg',
      size: 0,
      metadata: {
        integrityStatus: 'missing',
        createdAt: 1700000000000,
        modifiedAt: 1700000000000,
      },
    });

    const screen = render(<EntryCard entry={entry} onDelete={jest.fn()} />);

    expect(screen.getByTestId('photo-image-0')).toBeTruthy();
    expect(screen.getByText('说明文字')).toBeTruthy();
    expect(screen.getByTestId('entry-card')).toBeTruthy();
  });

  it('falls back to a placeholder after a broken photo load while keeping the card usable', () => {
    const entry = createPhotoEntry({
      uri: 'file:///broken.jpg',
      mimeType: 'image/jpeg',
      size: 0,
      metadata: {
        integrityStatus: 'missing',
        createdAt: 1700000000000,
        modifiedAt: 1700000000000,
      },
    });

    const screen = render(<EntryCard entry={entry} onDelete={jest.fn()} />);

    fireEvent(screen.getByTestId('photo-image-0'), 'error');
    fireEvent.press(screen.getByTestId('entry-card'));

    expect(screen.getByTestId('photo-image-0')).toBeTruthy();
    expect(screen.getByTestId('image-viewer')).toBeTruthy();
  });

  it.each([
    [
      'repairable metadata',
      {
        integrityStatus: 'repair_prompt_required',
        repairable: true,
        repairSource: 'local-original',
      },
    ],
    [
      'repair_pending metadata',
      {
        integrityStatus: 'repair_pending',
        repairable: false,
      },
    ],
  ])('keeps the photo card stable for %s variants', (_label, metadata) => {
    const entry = createPhotoEntry({
      uri: 'file:///local-photo.jpg',
      mimeType: 'image/jpeg',
      size: 10,
      metadata: {
        createdAt: 1700000000000,
        modifiedAt: 1700000000000,
        ...metadata,
      },
    });

    const screen = render(<EntryCard entry={entry} onDelete={jest.fn()} />);

    fireEvent.press(screen.getByTestId('entry-card'));

    expect(screen.getByTestId('photo-image-0')).toBeTruthy();
    expect(screen.getByText('说明文字')).toBeTruthy();
    expect(screen.getByTestId('image-viewer')).toBeTruthy();
  });
});
