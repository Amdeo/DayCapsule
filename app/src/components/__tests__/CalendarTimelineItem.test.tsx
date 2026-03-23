import React from 'react';
import { render } from '@testing-library/react-native';
import { CalendarTimelineItem } from '../CalendarTimelineItem';
import { Entry } from '@/src/types/entry';

let latestEntryCardProps: Record<string, unknown> | undefined;

jest.mock('../EntryCard', () => ({
  EntryCard: (props: Record<string, unknown>) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    latestEntryCardProps = props;

    return (
      <View testID="calendar-entry-card">
        <Text>{String(props.entry && (props.entry as Entry).content)}</Text>
      </View>
    );
  },
}));

const entry: Entry = {
  id: 'calendar-item-1',
  type: 'text',
  content: '日历条目',
  tags: ['测试'],
  timestamp: new Date('2026-03-23T09:30:00+08:00').getTime(),
  syncStatus: 'synced',
};

describe('CalendarTimelineItem', () => {
  beforeEach(() => {
    latestEntryCardProps = undefined;
  });

  it('renders timeline item shell and forwards calendar props', () => {
    const screen = render(
      <CalendarTimelineItem entry={entry} density="default" />
    );

    expect(screen.getByTestId('calendar-timeline-item-root')).toBeTruthy();
    expect(screen.getByTestId('calendar-timeline-item-dot')).toBeTruthy();
    expect(screen.getByTestId('calendar-timeline-item-time')).toBeTruthy();
    expect(screen.getByText('日历条目')).toBeTruthy();
  });

  it('forwards the calendar variant and density to EntryCard', () => {
    render(<CalendarTimelineItem entry={entry} density="default" />);

    expect(latestEntryCardProps?.variant).toBe('calendar');
    expect(latestEntryCardProps?.calendarDensity).toBe('default');
    expect(latestEntryCardProps?.cardSpacing).toBe(0);
  });
});
