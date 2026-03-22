import path from 'node:path';
import fs from 'node:fs/promises';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import styleGuardPlugin from '..';

const appRoot = path.resolve(__dirname, '../..');
const fixturesDir = path.resolve(__dirname, '../__fixtures__');

async function lintFixture(
  fileName: string,
  options?: {
    source?: string;
    filePath?: string;
  },
) {
  const source = options?.source ?? (await fs.readFile(path.join(fixturesDir, fileName), 'utf-8'));
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
    filePath: options?.filePath ?? path.join(appRoot, 'src/__style_guard_tests__', fileName),
  });
  return result;
}

describe('style guardrails', () => {
  test('flags new StyleSheet.create usage outside the allowlist', async () => {
    const result = await lintFixture('disallowed-stylesheet-create.tsx');

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((msg) => msg.ruleId === 'style-guard/no-new-stylesheet-create')).toBe(true);
  });

  test('flags StyleSheet.create for alias and namespace import forms', async () => {
    const result = await lintFixture('disallowed-stylesheet-create-alias-namespace.tsx');

    expect(result.messages.filter((msg) => msg.ruleId === 'style-guard/no-new-stylesheet-create')).toHaveLength(2);
  });

  test('flags static inline style objects that can be className', async () => {
    const result = await lintFixture('disallowed-static-inline-style.tsx');

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((msg) => msg.ruleId === 'style-guard/no-static-inline-styles')).toBe(true);
  });

  test('flags static inline style via variable reference', async () => {
    const result = await lintFixture('disallowed-static-inline-style-variable.tsx');

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((msg) => msg.ruleId === 'style-guard/no-static-inline-styles')).toBe(true);
  });

  test('flags conditional static inline style with null alternate branch', async () => {
    const result = await lintFixture('disallowed-static-inline-style-conditional-null.tsx');

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((msg) => msg.ruleId === 'style-guard/no-static-inline-styles')).toBe(true);
  });

  test('allows animated and runtime-driven style usage', async () => {
    const result = await lintFixture('allowed-dynamic-style.tsx');

    expect(result.errorCount).toBe(0);
  });

  test('allowlist supports baseline count: legacy count allowed but extra usage fails', async () => {
    const legacyFilePath = path.join(appRoot, 'src/__style_guard_tests__/allowlisted-baseline.tsx');

    const withinBaseline = await lintFixture('allowed-dynamic-style.tsx', {
      filePath: legacyFilePath,
      source: `
import { StyleSheet, View } from 'react-native';
const styles = StyleSheet.create({ container: { padding: 8 } });
export function LegacyWithinBaseline() {
  return <View style={{ padding: 12 }} />;
}
`,
    });

    expect(withinBaseline.messages.filter((msg) => msg.ruleId?.startsWith('style-guard/'))).toHaveLength(0);

    const exceedBaseline = await lintFixture('allowed-dynamic-style.tsx', {
      filePath: legacyFilePath,
      source: `
import { StyleSheet, View } from 'react-native';
const stylesA = StyleSheet.create({ a: { padding: 8 } });
const stylesB = StyleSheet.create({ b: { marginTop: 8 } });
export function LegacyExceedBaseline() {
  return (
    <>
      <View style={{ padding: 12 }} />
      <View style={{ marginTop: 4 }} />
      <View style={stylesA.a} />
      <View style={stylesB.b} />
    </>
  );
}
`,
    });

    expect(exceedBaseline.messages.filter((msg) => msg.ruleId === 'style-guard/no-new-stylesheet-create')).toHaveLength(1);
    expect(exceedBaseline.messages.filter((msg) => msg.ruleId === 'style-guard/no-static-inline-styles')).toHaveLength(1);
  });
});
