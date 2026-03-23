import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type FilterBarEntryType = 'all' | 'text' | 'photo' | 'voice';
export type FilterBarDateRange = 'all' | 'today' | 'week' | 'month';
export type FilterBarTypeStats = Record<FilterBarEntryType, number>;
export type FilterBarTypeOption = (typeof filterBarTypeOptions)[number];
export type FilterBarDateOption = (typeof filterBarDateOptions)[number];

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const filterBarTypeOptions: Array<{
  type: FilterBarEntryType;
  label: string;
  icon: IoniconName;
  color: string;
}> = [
  { type: 'all', label: '全部', icon: 'apps', color: '#737373' },
  { type: 'text', label: '文本', icon: 'document-text', color: '#A491D3' },
  { type: 'photo', label: '照片', icon: 'image', color: '#77C9D4' },
  { type: 'voice', label: '语音', icon: 'mic', color: '#F5A623' },
];

export const filterBarDateOptions: Array<{
  range: FilterBarDateRange;
  label: string;
}> = [
  { range: 'all', label: '全部时间' },
  { range: 'today', label: '今天' },
  { range: 'week', label: '本周' },
  { range: 'month', label: '本月' },
];
