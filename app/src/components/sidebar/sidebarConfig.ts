import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type SidebarAction =
  | 'settings'
  | 'about'
  | 'stats'
  | 'tags'
  | 'backup'
  | 'help';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface SidebarMenuItemConfig {
  action: SidebarAction;
  icon: IoniconName;
  iconColor: string;
  label: string;
  dividerBefore?: boolean;
}

export const SIDEBAR_MENU_ITEMS: SidebarMenuItemConfig[] = [
  {
    action: 'stats',
    icon: 'stats-chart-outline',
    iconColor: '#6A89CC',
    label: '统计',
  },
  {
    action: 'tags',
    icon: 'pricetags-outline',
    iconColor: '#A491D3',
    label: '标签管理',
  },
  {
    action: 'backup',
    icon: 'cloud-upload-outline',
    iconColor: '#77C9D4',
    label: '备份与同步',
  },
  {
    action: 'settings',
    icon: 'settings-outline',
    iconColor: '#737373',
    label: '设置',
    dividerBefore: true,
  },
  {
    action: 'help',
    icon: 'help-circle-outline',
    iconColor: '#737373',
    label: '帮助与反馈',
  },
  {
    action: 'about',
    icon: 'information-circle-outline',
    iconColor: '#737373',
    label: '关于',
  },
];
