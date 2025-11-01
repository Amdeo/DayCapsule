import React from 'react';
import {View, Text as RNText} from 'react-native';

export const Text = ({children, ...props}) => <RNText {...props}>{children}</RNText>;
export const Button = ({children, onPress, ...props}) => (
  <View {...props} onPress={onPress}>
    {children}
  </View>
);
export const TextInput = React.forwardRef(
  ({placeholder, value, onChangeText, testID, ...props}, ref) => (
    <RNText {...props} ref={ref} testID={testID} value={value} onChangeText={onChangeText}>
      {value}
    </RNText>
  ),
);
export const Dialog = ({visible, children, ...props}) =>
  visible ? <View {...props}>{children}</View> : null;

Dialog.Title = ({children, ...props}) => <RNText {...props}>{children}</RNText>;
Dialog.Content = ({children, ...props}) => <View {...props}>{children}</View>;
Dialog.ScrollArea = ({children, ...props}) => <View {...props}>{children}</View>;
Dialog.Actions = ({children, ...props}) => <View {...props}>{children}</View>;

export const Portal = ({children}) => {
  if (typeof children === 'function') {
    return <>{children()}</>;
  }
  return <>{children}</>;
};

export const IconButton = ({onPress, ...props}) => <View {...props} onPress={onPress} />;
export const Card = ({children, ...props}) => <View {...props}>{children}</View>;
export const Chip = ({children, onPress, ...props}) => (
  <View {...props} onPress={onPress}>
    {children}
  </View>
);
export const FAB = ({onPress, ...props}) => <View {...props} onPress={onPress} />;
export const ActivityIndicator = ({...props}) => <View {...props} />;
export const Snackbar = ({visible, children, ...props}) =>
  visible ? <View {...props}>{children}</View> : null;

export const ProgressBar = ({progress, color, ...props}) => (
  <View {...props} style={{height: 6, backgroundColor: color, width: `${progress * 100}%`}} />
);

export const Divider = ({...props}) => (
  <View {...props} style={{height: 1, backgroundColor: '#e0e0e0'}} />
);

export const RadioButton = ({value, onPress, ...props}) => <View {...props} onPress={onPress} />;

RadioButton.Group = ({value, onValueChange, children, ...props}) => {
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {onValueChange});
    }
    return child;
  });
  return <View {...props}>{childrenWithProps}</View>;
};

RadioButton.Item = ({label, value, onValueChange, testID, ...props}) => (
  <View
    {...props}
    testID={testID}
    onPress={() => {
      onValueChange?.(value);
    }}>
    <RNText>{label}</RNText>
  </View>
);

export const PaperProvider = ({children, ...props}) => <View {...props}>{children}</View>;

export const useTheme = () => ({
  colors: {
    primary: '#6200ee',
    background: '#ffffff',
    surface: '#f5f5f5',
    error: '#b00020',
    text: '#000000',
  },
});

export const MD3LightTheme = {
  colors: {
    primary: '#6200ee',
    background: '#ffffff',
    surface: '#f5f5f5',
    error: '#b00020',
    text: '#000000',
  },
};

export const MD3DarkTheme = {
  colors: {
    primary: '#bb86fc',
    background: '#121212',
    surface: '#1e1e1e',
    error: '#cf6679',
    text: '#ffffff',
  },
};
