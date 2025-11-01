import React from 'react';
import {View} from 'react-native';

export const NavigationContainer = ({children}) => <>{children}</>;

export const useNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
});

export const useRoute = () => ({
  name: 'Home',
  params: {},
  key: 'home-key',
});

export const useFocusEffect = jest.fn();

export const useIsFocused = jest.fn(() => true);

export const createNavigationContainerRef = jest.fn(() => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
}));
