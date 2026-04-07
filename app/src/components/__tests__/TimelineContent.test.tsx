import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { TimelineContent } from '../timeline-v2/TimelineContent';
import type { Entry } from '@/src/types/entry';
import type { TimeSection } from '../timeline-v2/timelineTypes';

jest.mock('../CalendarView', () => ({
  CalendarView: () => {
    const React = require('react');
    const { View } = require('react-native');

    return <View testID="mock-calendar-view" />;
  },
}));

const entry: Entry = {
  id: 'timeline-content-entry-1',
  type: 'text',
  content: '时间轴内容',
  tags: [],
  timestamp: new Date('2026-03-23T09:30:00+08:00').getTime(),
  syncStatus: 'synced',
};

const sections: TimeSection[] = [
  {
    title: '今天',
    data: [entry],
  },
];

describe('TimelineContent', () => {
  it('does not render a container-spanning timeline line behind the list', () => {
    const screen = render(
      <TimelineContent
        isTransitioning={false}
        displayMode="timeline"
        displayEntries={[entry]}
        hasEntries
        deleteEntry={jest.fn()}
        onViewEntry={jest.fn()}
        onEditEntry={jest.fn()}
        activeActionSheetId={null}
        onActionSheetOpen={jest.fn()}
        sectionListRef={{ current: null }}
        sections={sections}
        renderItem={() => <Text>item</Text>}
        renderSectionHeader={() => <Text>header</Text>}
        keyExtractor={(item) => item.id}
        bottomInset={0}
        onScroll={jest.fn()}
        hasMore={false}
        loadMore={jest.fn()}
        isLoadingMore={false}
      />
    );

    expect(screen.queryByTestId('timeline-vertical-line')).toBeNull();
  });
});
