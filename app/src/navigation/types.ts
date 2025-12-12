/**
 * 导航类型定义
 */

import type {StackScreenProps} from '@react-navigation/stack';
// import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs'; // No longer needed

// 根导航参数列表
export type RootStackParamList = {
  Onboarding: undefined;
  Timeline: undefined; // Our new main screen
  EntryDetail: {entryId: string}; // Added for EntryDetailScreen
};

// 主标签导航参数列表 - 不再使用
// export type MainTabParamList = {
//   Timeline: undefined;
//   Capture: undefined;
//   Search: undefined;
//   Stats: undefined;
//   Settings: undefined;
// };

// 屏幕Props类型 - 简化
export type OnboardingScreenProps = StackScreenProps<RootStackParamList, 'Onboarding'>;
export type TimelineScreenProps = StackScreenProps<RootStackParamList, 'Timeline'>;
// export type CaptureScreenProps = StackScreenProps<RootStackParamList, 'Capture'>;
// export type SearchScreenProps = StackScreenProps<RootStackParamList, 'Search'>;
// export type SettingsScreenProps = StackScreenProps<RootStackParamList, 'Settings'>;
// export type VoiceRecordScreenProps = StackScreenProps<RootStackParamList, 'VoiceRecord'>;
// export type EntryDetailScreenProps = StackScreenProps<RootStackParamList, 'EntryDetail'>;

// 标签页Props类型 - 不再使用
// export type TimelineTabProps = BottomTabScreenProps<MainTabParamList, 'Timeline'>;
// export type CaptureTabProps = BottomTabScreenProps<MainTabParamList, 'Capture'>;
// export type SearchTabProps = BottomTabScreenProps<MainTabParamList, 'Search'>;
// export type StatsTabProps = BottomTabScreenProps<MainTabParamList, 'Stats'>;
// export type SettingsTabProps = BottomTabScreenProps<MainTabParamList, 'Settings'>;

// 导航Hook类型 - 简化
export type RootNavigationProp = StackScreenProps<RootStackParamList>['navigation'];
// export type TabNavigationProp = BottomTabScreenProps<MainTabParamList>['navigation']; // No longer needed

// 路由Hook类型 - 简化
export type RootRouteProp = StackScreenProps<RootStackParamList>['route'];
// export type TabRouteProp = BottomTabScreenProps<MainTabParamList>['route']; // No longer needed