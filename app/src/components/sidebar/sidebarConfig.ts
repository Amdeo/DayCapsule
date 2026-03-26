import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type SidebarAction =
  | 'settings'
  | 'stats'
  | 'backup';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface SidebarMenuItemConfig {
  action: SidebarAction;
  icon: IoniconName;
  iconColor: string;
  label: string;
  description: string;
  dividerBefore?: boolean;
}

export const SIDEBAR_MENU_ITEMS: SidebarMenuItemConfig[] = [
  {
    action: 'stats',
    icon: 'stats-chart-outline',
    iconColor: '#6A89CC',
    label: '统计',
    description: '查看记录、照片、语音概览',
  },
  {
    action: 'backup',
    icon: 'cloud-upload-outline',
    iconColor: '#77C9D4',
    label: '备份与同步',
    description: '管理本地备份与云端同步',
  },
  {
    action: 'settings',
    icon: 'settings-outline',
    iconColor: '#737373',
    label: '设置',
    description: '调整账号、显示和存储偏好',
    dividerBefore: true,
  },
];
