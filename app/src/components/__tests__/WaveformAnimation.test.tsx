import React from 'react';
import { render } from '@testing-library/react-native';

import WaveformAnimation from '../WaveformAnimation';

describe('WaveformAnimation', () => {
  it('renders waveform shell with expected bar count', () => {
    const screen = render(<WaveformAnimation isRecording={false} />);

    expect(screen.getByTestId('waveform-animation-root')).toBeTruthy();
    expect(screen.getAllByTestId(/waveform-bar-/)).toHaveLength(50);
  });

  it('passes the custom color through to every waveform bar', () => {
    const screen = render(<WaveformAnimation isRecording color="#00FFAA" />);

    expect(screen.getByTestId('waveform-bar-0')).toHaveStyle({
      backgroundColor: '#00FFAA',
    });
    expect(screen.getByTestId('waveform-bar-49')).toHaveStyle({
      backgroundColor: '#00FFAA',
    });
  });
});
