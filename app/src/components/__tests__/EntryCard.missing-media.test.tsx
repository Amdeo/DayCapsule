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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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

  it('长按打开 ActionSheet 时应显示包含秒的时间', () => {
    const { getByTestId, getByText } = render(
      <EntryCard entry={textEntry} onDelete={jest.fn()} />
    );

    fireEvent(getByTestId('entry-card'), 'longPress');

    expect(
      getByText(
        new Date(textEntry.timestamp).toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    ).toBeTruthy();
  });
});
