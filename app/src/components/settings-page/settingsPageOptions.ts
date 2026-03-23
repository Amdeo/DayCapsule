import type {
  CalendarDensity,
  CardSpacing,
  PhotoHeightPreset,
} from '@/src/store/settingsStore';

export type SettingsOption<T extends string> = {
  value: T;
  label: string;
};

export const CARD_SPACING_OPTIONS: ReadonlyArray<SettingsOption<CardSpacing>> = [
  { value: 'compact', label: '紧凑' },
  { value: 'default', label: '默认' },
  { value: 'loose', label: '宽松' },
];

export const CALENDAR_DENSITY_OPTIONS: ReadonlyArray<SettingsOption<CalendarDensity>> = [
  { value: 'comfortable', label: '舒展' },
  { value: 'default', label: '标准' },
  { value: 'compact', label: '紧凑' },
];

export const PHOTO_HEIGHT_OPTIONS: ReadonlyArray<PhotoHeightPreset> = [
  'compact',
  'default',
  'large',
];

export const PHOTO_HEIGHT_LABELS: Record<PhotoHeightPreset, string> = {
  compact: '紧凑',
  default: '默认',
  large: '宽松',
};

export const PHOTO_HEIGHT_PREVIEW_HEIGHTS: Record<PhotoHeightPreset, number> = {
  compact: 24,
  default: 34,
  large: 48,
};
