import React from 'react';
import { render } from '@testing-library/react-native';

import { StatsPage } from '../StatsPage';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('@/src/store/entryStore', () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  return {
    useEntryStore: () => ({
      entries: [
        {
          id: 'text-1',
          type: 'text',
          timestamp: now,
          tags: ['旅行', '周记'],
        },
        {
          id: 'photo-1',
          type: 'photo',
          timestamp: now - oneDay,
          tags: ['旅行'],
        },
        {
          id: 'voice-1',
          type: 'voice',
          timestamp: now - 2 * oneDay,
          tags: ['灵感'],
          recordingStatus: 'completed',
          media: [{ duration: 90000 }],
        },
        {
          id: 'text-2',
          type: 'text',
          timestamp: now - 40 * oneDay,
          tags: ['周记'],
        },
      ],
    }),
  };
});

jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('StatsPage', () => {
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
});
