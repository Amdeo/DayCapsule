module.exports = {
  root: true,
  extends: ['@react-native'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react-native/no-inline-styles': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
    'no-console': ['warn', {allow: ['warn', 'error']}],
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unstable-nested-components': ['warn', {allowAsProps: true}],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'off',
        'no-undef': 'off',
      },
    },
  ],
};
