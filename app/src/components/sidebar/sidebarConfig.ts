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
    description: '查看记录趋势和数据分布',
  },
  {
    action: 'backup',
    icon: 'cloud-upload-outline',
    iconColor: '#77C9D4',
    label: '备份与同步',
    description: '管理数据备份与跨设备同步',
  },
  {
    action: 'settings',
    icon: 'settings-outline',
    iconColor: '#737373',
    label: '设置',
    description: '调整应用偏好和系统选项',
    dividerBefore: true,
  },
];
