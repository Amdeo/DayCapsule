import {MD3LightTheme, MD3DarkTheme} from 'react-native-paper';

// MemoryCapsule 主题配置
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    primaryContainer: '#EADDFF',
    secondary: '#625B71',
    secondaryContainer: '#E8DEF8',
    tertiary: '#7D5260',
    tertiaryContainer: '#FFD8E4',
    error: '#B3261E',
    errorContainer: '#F9DEDC',
    background: '#FFFBFE',
    surface: '#FFFBFE',
    surfaceVariant: '#E7E0EC',
    outline: '#79747E',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#21005D',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#1D192B',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#31111D',
    onError: '#FFFFFF',
    onErrorContainer: '#410E0B',
    onBackground: '#1C1B1F',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D0BCFF',
    primaryContainer: '#4F378B',
    secondary: '#CCC2DC',
    secondaryContainer: '#4A4458',
    tertiary: '#EFB8C8',
    tertiaryContainer: '#633B48',
    error: '#F2B8B5',
    errorContainer: '#8C1D18',
    background: '#1C1B1F',
    surface: '#1C1B1F',
    surfaceVariant: '#49454F',
    outline: '#938F99',
    onPrimary: '#381E72',
    onPrimaryContainer: '#EADDFF',
    onSecondary: '#332D41',
    onSecondaryContainer: '#E8DEF8',
    onTertiary: '#492532',
    onTertiaryContainer: '#FFD8E4',
    onError: '#601410',
    onErrorContainer: '#F9DEDC',
    onBackground: '#E6E1E5',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',
  },
};

// 主题类型
export type Theme = typeof lightTheme;
