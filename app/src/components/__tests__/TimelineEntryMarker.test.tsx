import React from 'react';
import { render } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { TimelineEntryMarker } from '../timeline-v2/TimelineEntryMarker';

jest.mock('../EntryCard', () => ({
  EntryCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return <View testID="timeline-entry-card" />;
  },
}));

const entry: Entry = {
  id: 'timeline-entry-1',
  type: 'text',
  content: '时间轴条目',
  tags: [],
  timestamp: new Date('2026-03-23T09:30:00+08:00').getTime(),
  syncStatus: 'synced',
};

describe('TimelineEntryMarker', () => {
  it('uses the tightened shared timeline geometry', () => {
    const screen = render(
      <TimelineEntryMarker
        entry={entry}
        onDeleteEntry={jest.fn()}
        isActionSheetActive={false}
        onActionSheetOpen={jest.fn()}
        isFirst={false}
        isLast={false}
        cardSpacing={12}
      />
    );

    expect(screen.getByTestId('timeline-entry-marker-timeline-entry-1')).toHaveStyle({ paddingLeft: 52 });
    expect(screen.getByTestId('timeline-entry-marker-dot-timeline-entry-1')).toHaveStyle({ left: 21 });
    expect(screen.getByTestId('timeline-entry-marker-connector-top-timeline-entry-1')).toBeTruthy();
    expect(screen.getByTestId('timeline-entry-marker-connector-bottom-timeline-entry-1')).toBeTruthy();
  });

  it('keeps the top connector but omits the bottom connector when the marker is the global last node', () => {
    const screen = render(
      <TimelineEntryMarker
        entry={entry}
        onDeleteEntry={jest.fn()}
        isActionSheetActive={false}
        onActionSheetOpen={jest.fn()}
        isFirst
        isLast
        cardSpacing={12}
      />
    );

    expect(screen.getByTestId('timeline-entry-marker-connector-top-timeline-entry-1')).toBeTruthy();
    expect(screen.queryByTestId('timeline-entry-marker-connector-bottom-timeline-entry-1')).toBeNull();
  });

  it('keeps the timestamp visible in card mode while hiding timeline decorations', () => {
    const screen = render(
      <TimelineEntryMarker
        entry={entry}
        onDeleteEntry={jest.fn()}
        isActionSheetActive={false}
        onActionSheetOpen={jest.fn()}
        isFirst={false}
        isLast={false}
        cardSpacing={12}
        showTimelineDecorations={false}
      />
    );

    expect(screen.getByText('09:30')).toBeTruthy();
    expect(screen.queryByTestId('timeline-entry-marker-dot-timeline-entry-1')).toBeNull();
    expect(screen.queryByTestId('timeline-entry-marker-connector-top-timeline-entry-1')).toBeNull();
    expect(screen.queryByTestId('timeline-entry-marker-connector-bottom-timeline-entry-1')).toBeNull();
  });
});
