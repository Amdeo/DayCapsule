import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface EntryTypeMeta {
  icon: IoniconName;
  label: string;
  accent: string;
}

export function getEntryTypeMeta(type: Entry['type']): EntryTypeMeta {
  switch (type) {
    case 'text':
      return { icon: 'document-text', label: '文本记录', accent: '#8F7AC8' };
    case 'photo':
      return { icon: 'image', label: '照片记录', accent: '#66BFC8' };
    case 'voice':
      return { icon: 'mic', label: '语音记录', accent: '#F0A53A' };
    default:
      return { icon: 'document-text', label: '记录', accent: '#8F7AC8' };
  }
}
