import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { theme } from './theme';
import { selectIsLocked } from '@store/slices/appSlice';

// Placeholder for screens - these will be implemented later
const TimelineScreen = () => null;
const SearchScreen = () => null;
const SettingsScreen = () => null;
const LockScreen = () => null;

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
                headerShown: false, // Timeline screen will have custom header
                gestureEnabled: true,
              }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{
                headerShown: false, // Search will be an overlay
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
