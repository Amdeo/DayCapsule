import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// 导入主页面
import {HomeScreen} from '../features/capture/screens/HomeScreen';

// 创建Tab导航器
const Tab = createBottomTabNavigator();

// 简单的测试屏幕组件
const TimelineScreen: React.FC = () => (
  <View style={styles.testScreen}>
    <Text style={styles.testText}>时间线</Text>
  </View>
);

const SearchScreen: React.FC = () => (
  <View style={styles.testScreen}>
    <Text style={styles.testText}>搜索</Text>
  </View>
);

const SettingsScreen: React.FC = () => (
  <View style={styles.testScreen}>
    <Text style={styles.testText}>设置</Text>
  </View>
);

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#666666',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#000000',
          tabBarIconStyle: {
            marginBottom: -4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: 4,
          },
        }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: '首页',
            headerShown: false,
            tabBarIcon: ({color, size}) => (
              <Text style={{fontSize: 20, color, marginBottom: 4}}>🏠</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            title: '时间线',
            tabBarIcon: ({color, size}) => (
              <Text style={{fontSize: 20, color, marginBottom: 4}}>📅</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            title: '搜索',
            tabBarIcon: ({color, size}) => (
              <Text style={{fontSize: 20, color, marginBottom: 4}}>🔍</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: '设置',
            tabBarIcon: ({color, size}) => (
              <Text style={{fontSize: 20, color, marginBottom: 4}}>⚙️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  testScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  testText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
});
