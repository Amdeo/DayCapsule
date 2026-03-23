import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../_layout';

const tabsScreens: Array<{ name: string; options?: any }> = [];
let capturedScreenOptions: any;

jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = Object.assign(
    ({ children, screenOptions }: { children?: React.ReactNode; screenOptions?: any }) => {
      capturedScreenOptions = screenOptions;
      return <>{children}</>;
    },
    {
      Screen: ({ name, options }: { name: string; options?: any }) => {
        tabsScreens.push({ name, options });
        return null;
      },
    }
  );

  return { Tabs };
});

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: ({ name, color }: { name?: string; color?: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>{`${name ?? 'icon'}-${color ?? 'none'}`}</Text>;
  },
}));

jest.mock('@/constants/Colors', () => ({
  __esModule: true,
  default: {
    light: { tint: '#6A89CC' },
    dark: { tint: '#8BA3DC' },
  },
}));

jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

describe('TabLayout', () => {
  beforeEach(() => {
    tabsScreens.length = 0;
    capturedScreenOptions = undefined;
  });

  it('renders list and gear tab icons with layout test ids', () => {
    render(<TabLayout />);

    expect(capturedScreenOptions).toBeTruthy();

    const indexScreen = tabsScreens.find((screen) => screen.name === 'index');
    const settingsScreen = tabsScreens.find((screen) => screen.name === 'two');

    expect(indexScreen?.options).toBeTruthy();
    expect(settingsScreen?.options).toBeTruthy();

    const listIconTree = render(indexScreen!.options.tabBarIcon({ color: '#333' }));
    const gearIconTree = render(settingsScreen!.options.tabBarIcon({ color: '#333' }));

    expect(listIconTree.getByTestId('tab-layout-icon-list')).toBeTruthy();
    expect(gearIconTree.getByTestId('tab-layout-icon-gear')).toBeTruthy();
  });
});
