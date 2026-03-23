import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface AboutFeature {
  icon: IoniconName;
  text: string;
}

export interface AboutTechStackItem {
  name: string;
  version: string;
}

export interface AboutLinkItem {
  icon: IoniconName;
  label: string;
  url: string;
}

export const ABOUT_PAGE_COPY = {
  appName: 'MemoryCapsule',
  version: 'v1.0.0',
  tagline: '记录生活的每个瞬间',
  developer: 'Built with ❤️ using 2025-2026 modern React Native tech stack',
  copyrightYear: '© 2026 MemoryCapsule',
  copyrightText: 'All rights reserved',
} as const;

export const ABOUT_FEATURES: AboutFeature[] = [
  { icon: 'document-text', text: '文本记录 - 快速记录想法和灵感' },
  { icon: 'image', text: '照片记录 - 捕捉美好瞬间' },
  { icon: 'mic', text: '语音记录 - 记录声音和情感' },
  { icon: 'search', text: '智能搜索 - 快速找到记忆' },
  { icon: 'pricetags', text: '标签管理 - 分类整理记录' },
  { icon: 'time', text: '时间轴 - 按时间浏览记忆' },
];

export const ABOUT_TECH_STACK: AboutTechStackItem[] = [
  { name: 'React Native', version: '0.81.5' },
  { name: 'Expo SDK', version: '54' },
  { name: 'TypeScript', version: '5.9' },
  { name: 'Zustand', version: '5.0' },
  { name: 'NativeWind', version: '4.0' },
  { name: 'Reanimated', version: '4.1' },
];

export const ABOUT_LINKS: AboutLinkItem[] = [
  {
    icon: 'logo-github',
    label: 'GitHub 仓库',
    url: 'https://github.com',
  },
  {
    icon: 'document-text',
    label: '使用文档',
    url: 'https://expo.dev',
  },
];
