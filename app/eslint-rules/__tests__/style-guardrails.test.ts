import path from 'node:path';
import fs from 'node:fs/promises';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import styleGuardPlugin from '..';

const appRoot = path.resolve(__dirname, '../..');
const fixturesDir = path.resolve(__dirname, '../__fixtures__');

async function lintFixture(fileName: string) {
  const source = await fs.readFile(path.join(fixturesDir, fileName), 'utf-8');
  const eslint = new ESLint({
    cwd: appRoot,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        plugins: {
          'style-guard': styleGuardPlugin,
        },
        rules: {
          'style-guard/no-new-stylesheet-create': 'error',
          'style-guard/no-static-inline-styles': 'error',
        },
      },
    ],
  });

  const [result] = await eslint.lintText(source, {
    filePath: path.join(appRoot, 'src/__style_guard_tests__', fileName),
  });
  return result;
}

describe('style guardrails', () => {
  test('flags new StyleSheet.create usage outside the allowlist', async () => {
    const result = await lintFixture('disallowed-stylesheet-create.tsx');

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((msg) => msg.ruleId === 'style-guard/no-new-stylesheet-create')).toBe(true);
  });

  test('flags static inline style objects that can be className', async () => {
    const result = await lintFixture('disallowed-static-inline-style.tsx');

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((msg) => msg.ruleId === 'style-guard/no-static-inline-styles')).toBe(true);
  });

  test('allows animated and runtime-driven style usage', async () => {
    const result = await lintFixture('allowed-dynamic-style.tsx');

    expect(result.errorCount).toBe(0);
  });
});
