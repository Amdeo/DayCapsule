import React from 'react';
import {View} from 'react-native';

export const SafeAreaProvider = ({children}) => <>{children}</>;

export const SafeAreaView = ({children, ...props}) => <View {...props}>{children}</View>;

export const useSafeAreaInsets = () => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});
