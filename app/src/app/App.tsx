import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 简单的主题
const theme = {
  dark: false,
  colors: {
    primary: '#6A89CC',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#6C6B70',
    outline: '#79747E',
    error: '#B00020',
  },
};

// 测试屏幕
const TestScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>✅ MemoryCapsule</Text>
      <Text style={styles.subtitle}>应用运行正常！</Text>
      <Text style={styles.text}>这是简化版测试界面</Text>
    </View>
  </SafeAreaView>
);

const Stack = createStackNavigator();

const App: React.FC = () => {
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
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={TestScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
});

export default App;
