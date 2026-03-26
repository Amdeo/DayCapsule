import React from 'react';
import { render } from '@testing-library/react-native';
import { TimelineSectionHeader } from '../TimelineSectionHeader';

describe('TimelineSectionHeader', () => {
  it('renders the section title with the existing timeline shell', () => {
    const { getByTestId, getByText } = render(
      <TimelineSectionHeader title="今天" timestamp={Date.now()} />
    );

    expect(getByTestId('timeline-section-header')).toHaveStyle({ height: 48 });
    expect(getByText('今天')).toBeTruthy();
  });

  it('exposes the timestamp through the accessibility hint for downstream consumers', () => {
    const timestamp = 1700000000000;
    const { getByTestId } = render(
      <TimelineSectionHeader title="昨天" timestamp={timestamp} />
    );

    expect(getByTestId('timeline-section-header').props.accessibilityHint).toBe(String(timestamp));
  });
});
