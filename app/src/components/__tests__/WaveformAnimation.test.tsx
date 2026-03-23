import React from 'react';
import { render } from '@testing-library/react-native';

import WaveformAnimation from '../WaveformAnimation';

describe('WaveformAnimation', () => {
  it('renders waveform shell with expected bar count', () => {
    const screen = render(<WaveformAnimation isRecording={false} />);

    expect(screen.getByTestId('waveform-animation-root')).toBeTruthy();
    expect(screen.getAllByTestId(/waveform-bar-/)).toHaveLength(50);
  });
});
