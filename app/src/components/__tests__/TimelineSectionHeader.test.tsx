import React from 'react';
import { render } from '@testing-library/react-native';
import { TimelineSectionHeader } from '../timeline-v2/TimelineSectionHeader';

describe('TimelineSectionHeader', () => {
  it('renders the section title', () => {
    const { getByText, toJSON } = render(<TimelineSectionHeader title="今天" />);
    const title = getByText('今天');

    expect(title).toBeTruthy();
    expect(toJSON()).toHaveStyle({ height: 48, paddingLeft: 64 });
  });
});
