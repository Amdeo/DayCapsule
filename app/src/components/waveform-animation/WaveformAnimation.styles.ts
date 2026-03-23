import { StyleSheet } from 'react-native';
import {
  WAVEFORM_BAR_GAP,
  WAVEFORM_BAR_RADIUS,
  WAVEFORM_BAR_WIDTH,
  WAVEFORM_CONTAINER_HEIGHT,
} from './waveformAnimationConfig';

export const waveformAnimationStyles = StyleSheet.create({
  bar: {
    borderRadius: WAVEFORM_BAR_RADIUS,
    width: WAVEFORM_BAR_WIDTH,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: WAVEFORM_BAR_GAP,
    height: WAVEFORM_CONTAINER_HEIGHT,
    justifyContent: 'center',
    // 防止固定宽度（50根×3px=149px）超出父容器时覆盖相邻元素
    // 注意：此属性在 iOS 上触发 clipsToBounds，在 Android 上禁用 elevation 阴影
    overflow: 'hidden',
  },
});
