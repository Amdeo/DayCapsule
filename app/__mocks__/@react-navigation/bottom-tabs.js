import React from 'react';

export const createBottomTabNavigator = jest.fn(() => ({
  Navigator: ({children}) => <>{children}</>,
  Screen: ({children}) => <>{children}</>,
}));

export const useBottomTabBarHeight = jest.fn(() => 60);
