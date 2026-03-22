const RULE_ID = 'style-guard/no-new-stylesheet-create';
const {
  toProjectRelativePath,
  buildActiveBaselineConfig,
  createFingerprint,
  createFingerprintBudget,
  consumeFromBudget,
  extractRuleBaseline,
} = require('./baseline');

function collectStyleSheetAliases(programNode) {
  const styleSheetIdentifiers = new Set(['StyleSheet']);
  const reactNativeNamespaceIdentifiers = new Set();

  for (const statement of programNode.body) {
    if (statement.type !== 'ImportDeclaration' || statement.source.value !== 'react-native') {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.imported &&
        specifier.imported.type === 'Identifier' &&
        specifier.imported.name === 'StyleSheet'
      ) {
        styleSheetIdentifiers.add(specifier.local.name);
      }

      if (specifier.type === 'ImportNamespaceSpecifier') {
        reactNativeNamespaceIdentifiers.add(specifier.local.name);
      }
    }
  }

  return { styleSheetIdentifiers, reactNativeNamespaceIdentifiers };
}

function isStyleSheetCreateCall(node, aliases) {
  if (
    !node.callee ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    !node.callee.property ||
    node.callee.property.type !== 'Identifier' ||
    node.callee.property.name !== 'create'
  ) {
    return false;
  }

  const target = node.callee.object;
  if (!target) {
    return false;
  }

  if (target.type === 'Identifier') {
    return aliases.styleSheetIdentifiers.has(target.name);
  }

  if (
    target.type === 'MemberExpression' &&
    !target.computed &&
    target.object &&
    target.object.type === 'Identifier' &&
    aliases.reactNativeNamespaceIdentifiers.has(target.object.name) &&
    target.property &&
    target.property.type === 'Identifier' &&
    target.property.name === 'StyleSheet'
  ) {
    return true;
  }

  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow new StyleSheet.create usage outside the legacy allowlist.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: true,
      },
    ],
    messages: {
      noNewStyleSheetCreate:
        '禁止新增 StyleSheet.create。请改用 className / NativeWind，或先完成对应迁移 chunk。',
    },
  },
  create(context) {
    const fileName = context.getFilename();
    if (!fileName || fileName === '<input>' || fileName === '<text>') {
      return {};
    }

    const relativePath = toProjectRelativePath(fileName);
    const baselineConfig = buildActiveBaselineConfig(context.options[0]);
    const baselineFingerprints =
      process.env.STYLE_GUARD_IGNORE_BASELINE === '1'
        ? []
        : extractRuleBaseline(baselineConfig.ruleBaselines, relativePath, RULE_ID);
    const fingerprintBudget = createFingerprintBudget(baselineFingerprints);
    const sourceCode = context.sourceCode;
    let aliases = {
      styleSheetIdentifiers: new Set(['StyleSheet']),
      reactNativeNamespaceIdentifiers: new Set(),
    };

    return {
      Program(node) {
        aliases = collectStyleSheetAliases(node);
      },
      CallExpression(node) {
        if (!isStyleSheetCreateCall(node, aliases)) {
          return;
        }

        const fingerprint = createFingerprint(sourceCode.getText(node));
        if (consumeFromBudget(fingerprintBudget, fingerprint)) {
          return;
        }

        context.report({
          node,
          messageId: 'noNewStyleSheetCreate',
        });
      },
    };
  },
};
