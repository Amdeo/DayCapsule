import type { ComponentProps } from 'react';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LastAddType } from '@/src/store/settingsStore';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

export const FAB_SIZE = 56;
export const FAB_BOTTOM = 32;
export const FAB_CENTER_X = SCREEN_WIDTH / 2;
export const FAB_CENTER_Y = SCREEN_HEIGHT - FAB_BOTTOM - FAB_SIZE / 2;
export const OPTION_SIZE = 56;
export const OPTION_ICON_HALF = OPTION_SIZE / 2;
export const DEAD_ZONE_DP = 30;
export const LONG_PRESS_MS = 300;
export const PEEK_HEIGHT = 10;
export const PEEK_TRANSLATE_Y = FAB_SIZE + FAB_BOTTOM - PEEK_HEIGHT;

export const FAN_OPTIONS = [
  { type: 'text' as LastAddType, icon: 'create-outline' as IoniconName, label: '文字', color: '#A491D3', angle: -60, dist: 120 },
  { type: 'photo' as LastAddType, icon: 'images' as IoniconName, label: '相册', color: '#57B8C8', angle: -20, dist: 120 },
  { type: 'camera' as LastAddType, icon: 'camera' as IoniconName, label: '拍照', color: '#77C9D4', angle: 20, dist: 120 },
  { type: 'voice' as LastAddType, icon: 'mic-outline' as IoniconName, label: '语音', color: '#F5A623', angle: 60, dist: 120 },
] as const;

export type FanOption = (typeof FAN_OPTIONS)[number];

export const TYPE_CONFIG: Record<LastAddType, { icon: IoniconName; color: string }> = {
  text: { icon: 'create-outline', color: '#A491D3' },
  camera: { icon: 'camera', color: '#77C9D4' },
  photo: { icon: 'images', color: '#57B8C8' },
  voice: { icon: 'mic-outline', color: '#F5A623' },
};

export const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 1,
  overshootClamping: true,
};

export function hitTest(dx: number, dy: number): number {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < DEAD_ZONE_DP) {
    return -1;
  }

  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < -40) {
    return 0;
  }
  if (angle < 0) {
    return 1;
  }
  if (angle < 40) {
    return 2;
  }

  return 3;
}
