const tseslint = require('typescript-eslint');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const globals = require('globals');
const styleGuardPlugin = require('./eslint-rules');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'ios/**',
      'android/**',
      'components/**',
      '__mocks__/**',
      'eslint-rules/**',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
      'style-guard': styleGuardPlugin,
    },
    rules: {
      'style-guard/no-new-stylesheet-create': 'error',
      'style-guard/no-static-inline-styles': 'error',
    },
  },
];
