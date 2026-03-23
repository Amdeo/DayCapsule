import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type SearchFilterType = 'all' | 'text' | 'photo' | 'voice';
export type SearchDateRange = 'all' | 'today' | 'week' | 'month';
export type SearchTypeFilter = (typeof searchTypeFilters)[number];
export type SearchDateOption = (typeof searchDateOptions)[number];

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const searchTypeFilters: Array<{
  key: SearchFilterType;
  label: string;
  icon: IoniconName;
  color: string;
}> = [
  { key: 'all', label: '全部', icon: 'apps', color: '#737373' },
  { key: 'text', label: '文字', icon: 'document-text', color: '#A491D3' },
  { key: 'photo', label: '照片', icon: 'image', color: '#77C9D4' },
  { key: 'voice', label: '语音', icon: 'mic', color: '#F5A623' },
];

export const searchDateOptions: Array<{
  key: SearchDateRange;
  label: string;
}> = [
  { key: 'all', label: '全部时间' },
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
];
