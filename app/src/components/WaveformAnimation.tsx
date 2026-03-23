import React, { useEffect } from 'react';
import { View } from 'react-native';
import { WaveBar } from './waveform-animation/WaveBar';
import {
  DEFAULT_WAVEFORM_BAR_COLOR,
  WAVEFORM_BAR_COUNT,
} from './waveform-animation/waveformAnimationConfig';
import { waveformAnimationStyles as styles } from './waveform-animation/WaveformAnimation.styles';

interface WaveformAnimationProps {
  isRecording: boolean;
  color?: string;
}

const WaveformAnimation: React.FC<WaveformAnimationProps> = ({
  isRecording,
  color = DEFAULT_WAVEFORM_BAR_COLOR,
}) => {
  return (
    <View testID="waveform-animation-root" style={styles.container}>
      {Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => (
        <WaveBar key={index} testID={`waveform-bar-${index}`} isRecording={isRecording} color={color} />
      ))}
    </View>
  );
};

export default WaveformAnimation;
