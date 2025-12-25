import { DefaultTheme } from 'react-native-paper';

// MemoryCapsule 主题配置
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6A89CC',      // 主色调 - 蓝色
    primaryContainer: '#E8F0FE',
    secondary: '#F5A68D',     // 次要色 - 珊瑚色
    secondaryContainer: '#FEF7F3',
    tertiary: '#77C9D4',      // 第三色 - 青色
    tertiaryContainer: '#E7FCFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FAFAFA',
    error: '#B00020',
    errorContainer: '#FDEAEA',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#6C6B70',
    onBackground: '#1C1B1F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#B8C6FF',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    
    // 自定义颜色
    accent: '#A491D3',        // 强调色 - 紫色
    photo: '#77C9D4',        // 照片相关
    voice: '#F5A623',        // 语音相关
    text: '#A491D3',         // 文字相关
    
    // 渐变色支持
    gradient: {
      primary: ['#6A89CC', '#A491D3'],
      secondary: ['#F5A68D', '#F5A623'],
      accent: ['#A491D3', '#77C9D4'],
    },
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
  elevation: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 16,
  },
};

// 深色主题
export const darkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#B8C6FF',      // 深色模式下的主色调
    primaryContainer: '#293248',
    secondary: '#FFB4A6',    // 深色模式下的次要色
    secondaryContainer: '#402D28',
    tertiary: '#89D7E3',     // 深色模式下的第三色
    tertiaryContainer: '#17343A',
    surface: '#1C1B1F',
    surfaceVariant: '#2C2B2F',
    background: '#100F10',
    error: '#FFB4AB',
    errorContainer: '#410002',
    onPrimary: '#102149',
    onSecondary: '#32100E',
    onTertiary: '#00363D',
    onSurface: '#E1E0E5',
    onSurfaceVariant: '#C6C5D0',
    onBackground: '#E1E0E5',
    outline: '#8F9099',
    outlineVariant: '#45464A',
    inverseSurface: '#E1E0E5',
    inverseOnSurface: '#100F10',
    inversePrimary: '#6A89CC',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    
    // 深色模式下的自定义颜色
    accent: '#B8A8E6',       // 深色模式下的强调色
    photo: '#89D7E3',        // 深色模式下的照片相关
    voice: '#FFB547',        // 深色模式下的语音相关
    text: '#B8A8E6',         // 深色模式下的文字相关
    
    // 深色模式渐变色
    gradient: {
      primary: ['#B8C6FF', '#B8A8E6'],
      secondary: ['#FFB4A6', '#FFB547'],
      accent: ['#B8A8E6', '#89D7E3'],
    },
  },
  fonts: theme.fonts,
  spacing: theme.spacing,
  borderRadius: theme.borderRadius,
  elevation: theme.elevation,
};

// 主题选择器
export const getTheme = (isDark: boolean) => isDark ? darkTheme : theme;

// 组件样式工厂函数
export const createThemedStyles = <T extends Record<string, any>>(styles: T) => {
  return (isDark: boolean) => {
    const currentTheme = getTheme(isDark);
    return {
      ...styles,
      // 可以在这里添加主题相关的样式变换
    };
  };
};

// 颜色工具函数
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // 简单的透明度处理，实际项目中可能需要更复杂的颜色处理
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// 主题常量
export const THEME_CONSTANTS = {
  ANIMATION_DURATION: 200,
  HEADER_HEIGHT: 56,
  TAB_HEIGHT: 60,
  BOTTOM_SNAP_POINTS: ['25%', '50%', '90%'],
  CARD_BORDER_RADIUS: 12,
  BUTTON_BORDER_RADIUS: 8,
  INPUT_BORDER_RADIUS: 6,
};

export default theme;
