import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// 占位屏幕组件（稍后实现）
import {HomeScreen} from '@features/capture/screens/HomeScreen';
import {TimelineScreen} from '@features/timeline/screens/TimelineScreen';
import {SearchScreen} from '@features/search/screens/SearchScreen';
import {SettingsScreen} from '@features/settings/screens/SettingsScreen';

export type RootTabParamList = {
  Home: undefined;
  Timeline: undefined;
  Search: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
        }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: '快记',
            tabBarIcon: ({color, size}: {color: string; size: number}) => (
              <Icon name="camera-plus" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            title: '时间线',
            tabBarIcon: ({color, size}: {color: string; size: number}) => (
              <Icon name="timeline-clock" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            title: '搜索',
            tabBarIcon: ({color, size}: {color: string; size: number}) => (
              <Icon name="magnify" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: '设置',
            tabBarIcon: ({color, size}: {color: string; size: number}) => (
              <Icon name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
