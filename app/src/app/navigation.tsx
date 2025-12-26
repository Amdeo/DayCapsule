import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { theme } from './theme';
import { selectIsLocked } from '@store/slices/appSlice';

// Simple placeholder screens with content
const TimelineScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>📅 时间线</Text>
    <Text style={styles.subtext}>您的记忆时间线</Text>
  </View>
);

const SearchScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>🔍 搜索</Text>
    <Text style={styles.subtext}>搜索您的记忆</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>⚙️ 设置</Text>
    <Text style={styles.subtext}>应用设置</Text>
  </View>
);

const LockScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>🔒 已锁定</Text>
    <Text style={styles.subtext}>请解锁后查看</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
});

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const isLocked = useSelector(selectIsLocked);

  return (
    <NavigationContainer theme={{
      dark: theme.dark,
      colors: {
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.outline,
        notification: theme.colors.error,
      },
    }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '600',
          },
          cardStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        {isLocked ? (
          <Stack.Screen
            name="Lock"
            component={LockScreen}
            options={{
              headerShown: false,
              cardStyle: { backgroundColor: theme.colors.background },
            }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Timeline"
              component={TimelineScreen}
              options={{
                headerShown: false,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
                cardOverlayEnabled: true,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: '设置',
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Navigation types
export type RootStackParamList = {
  Timeline: undefined;
  Search: undefined;
  Settings: undefined;
  Lock: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
