import React from 'react';
import { render } from '@testing-library/react-native';
import { TimelineEmptyState } from '../TimelineEmptyState';

describe('TimelineEmptyState', () => {
  it('renders the empty-state shell and copy', () => {
    const { getByTestId, getByText } = render(<TimelineEmptyState />);

    expect(getByTestId('timeline-empty-state')).toBeTruthy();
    expect(getByText('还没有记忆')).toBeTruthy();
    expect(getByText('点击右下角 + 按钮开始记录')).toBeTruthy();
  });

  it('does not render unrelated placeholder copy', () => {
    const { queryByText } = render(<TimelineEmptyState />);

    expect(queryByText('加载中')).toBeNull();
  });
});
