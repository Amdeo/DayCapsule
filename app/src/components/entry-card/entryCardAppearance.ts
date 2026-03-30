import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import type { CalendarDensity } from '@/src/store/settingsStore';
import type { PhotoImageRadiusStyle } from '../photo-grid/photoGridTypes';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type EntryCardVariant = 'default' | 'calendar';

export type EntryCardSyncStatusMeta = {
  iconName: IoniconName | null;
  iconColor: string;
  text: string | null;
};

export function getEntryCardBackgroundColor(
  type: Entry['type'],
  variant: EntryCardVariant,
): string {
  if (variant === 'calendar') {
    return '#FFFDF9';
  }

  switch (type) {
    case 'text':
      return '#E0D9F5';
    case 'photo':
      return '#CCE9EF';
    case 'voice':
      return '#FCE8C0';
    default:
      return '#FFFFFF';
  }
}

export function getEntryCardPressedBackgroundColor(
  type: Entry['type'],
  variant: EntryCardVariant,
): string {
  if (variant === 'calendar') {
    return '#FBF6EF';
  }

  switch (type) {
    case 'text':
      return '#D4CBF2';
    case 'photo':
      return '#BDDEE5';
    case 'voice':
      return '#F8DFB0';
    default:
      return '#F5F5F5';
  }
}

export function getEntryCardCalendarBorderColor(type: Entry['type']): string {
  switch (type) {
    case 'text':
      return '#DDD0EF';
    case 'photo':
      return '#D5E8E5';
    case 'voice':
      return '#EFD8B5';
    default:
      return '#E6DDD2';
  }
}

export function getEntryCardSyncStatusMeta(entry: Entry): EntryCardSyncStatusMeta {
  switch (entry.syncStatus) {
    case 'pending':
      return {
        iconName: 'cloud-upload-outline',
        iconColor: '#6A89CC',
        text: '待同步',
      };
    case 'pending_upload':
      return {
        iconName: 'cloud-upload-outline',
        iconColor: '#6A89CC',
        text: '待上传',
      };
    case 'uploading':
      return {
        iconName: 'sync-outline',
        iconColor: '#F5A623',
        text: '上传中',
      };
    case 'failed':
      return {
        iconName: 'alert-circle-outline',
        iconColor: '#D9534F',
        text: entry.conflictedCopyOf ? '冲突副本' : '同步失败',
      };
    case 'pending_delete':
      return {
        iconName: 'trash-outline',
        iconColor: '#A94442',
        text: '待删除',
      };
    default:
      return {
        iconName: null,
        iconColor: '#A3A3A3',
        text: null,
      };
  }
}

const CALENDAR_ENTRY_CARD_PHOTO_HEIGHTS: Record<CalendarDensity, number> = {
  comfortable: 260,
  default: 220,
  compact: 180,
};

export function getEntryCardResolvedPhotoHeight(
  maxPhotoHeight: number,
  variant: EntryCardVariant,
  calendarDensity: CalendarDensity,
): number {
  if (variant !== 'calendar') {
    return maxPhotoHeight;
  }

  return Math.min(maxPhotoHeight, CALENDAR_ENTRY_CARD_PHOTO_HEIGHTS[calendarDensity]);
}

export function getEntryCardPhotoImageRadius(entry: Entry): PhotoImageRadiusStyle {
  const hasPhotoFooter =
    entry.type === 'photo'
      ? Boolean(entry.content || (entry.tags && entry.tags.length > 0))
      : false;

  if (hasPhotoFooter) {
    return {
      borderRadius: 10,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    };
  }

  return {
    borderRadius: 10,
  };
}
