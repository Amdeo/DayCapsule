import React from 'react';
import { render } from '@testing-library/react-native';

import { StatsPage } from '../StatsPage';

const fixedNow = new Date('2026-03-26T12:00:00+08:00').getTime();
const oneDay = 24 * 60 * 60 * 1000;

const defaultEntries = [
  {
    id: 'text-1',
    type: 'text',
    timestamp: fixedNow,
    tags: ['旅行', '周记'],
  },
  {
    id: 'photo-1',
    type: 'photo',
    timestamp: fixedNow - oneDay,
    tags: ['旅行'],
  },
  {
    id: 'voice-1',
    type: 'voice',
    timestamp: fixedNow - 2 * oneDay,
    tags: ['灵感'],
    recordingStatus: 'completed',
    media: [{ duration: 90000 }],
  },
  {
    id: 'text-2',
    type: 'text',
    timestamp: fixedNow - 40 * oneDay,
    tags: ['周记'],
  },
];

let mockEntries = [...defaultEntries];

function setMockEntries(entries: Array<Record<string, unknown>>) {
  mockEntries = entries;
}

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('@/src/store/entryStore', () => ({
  useEntryStore: () => ({
    entries: mockEntries,
  }),
}));

jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('StatsPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    setMockEntries([...defaultEntries]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the stats page shell, overview grid and trend card', () => {
    const screen = render(<StatsPage visible onClose={() => {}} />);

    expect(screen.getByTestId('stats-page-root')).toBeTruthy();
    expect(screen.getByTestId('stats-overview-grid')).toBeTruthy();
    expect(screen.getByTestId('stats-trend-card')).toBeTruthy();
    expect(screen.getByText('总览')).toBeTruthy();
    expect(screen.getByText('语音总时长')).toBeTruthy();
    expect(screen.getByText('1分30秒')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
  });

  it('renders the empty-state time summary and hides tags and voice duration when there is no data', () => {
    setMockEntries([]);

    const screen = render(<StatsPage visible onClose={() => {}} />);

    expect(screen.getByText('本周新增')).toBeTruthy();
    expect(screen.getByText('本月新增')).toBeTruthy();
    expect(screen.getByText('暂无')).toBeTruthy();
    expect(screen.queryByText('语音总时长')).toBeNull();
    expect(screen.queryByText('常用标签')).toBeNull();
  });

  it('hides voice duration when all voice entries are still recording', () => {
    setMockEntries([
      {
        id: 'voice-recording',
        type: 'voice',
        timestamp: fixedNow,
        tags: ['采访'],
        recordingStatus: 'recording',
        media: [{ duration: 180000 }],
      },
    ]);

    const screen = render(<StatsPage visible onClose={() => {}} />);

    expect(screen.getByText('最活跃的一天')).toBeTruthy();
    expect(screen.queryByText('语音总时长')).toBeNull();
    expect(screen.getByText('#采访')).toBeTruthy();
  });
});
