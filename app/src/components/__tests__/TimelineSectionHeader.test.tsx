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
});
