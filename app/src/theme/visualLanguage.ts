export const visualLanguage = {
  surface: {
    page: '#FAF6EF',
    card: '#FFF9F2',
    modal: '#FFF8F0',
    backdrop: 'rgba(34, 26, 20, 0.42)',
  },
  text: {
    primary: '#3F332A',
    secondary: '#6F6257',
    tertiary: '#9E9084',
  },
  accent: {
    error: '#B96A57',
    errorPressed: '#9E5646',
  },
  entryType: {
    text: '#8F7AC8',
    photo: '#77C9D4',
    voice: '#F0A53A',
  },
  radius: {
    control: 14,
    card: 20,
    modal: 24,
  },
} as const;

export type VisualLanguage = typeof visualLanguage;
