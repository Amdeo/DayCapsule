const path = require('node:path');
const allowlist = require('../eslint/style-guard-allowlist');

const appRoot = path.resolve(__dirname, '..');
const RULE_ID = 'style-guard/no-new-stylesheet-create';

function normalizeAllowlist(allowlistConfig) {
  if (Array.isArray(allowlistConfig)) {
    return {
      legacyFiles: allowlistConfig,
      ruleBaselines: {},
    };
  }

  return {
    legacyFiles: allowlistConfig.legacyFiles || [],
    ruleBaselines: allowlistConfig.ruleBaselines || {},
  };
}

const normalizedAllowlist = normalizeAllowlist(allowlist);
const legacyFileSet = new Set(normalizedAllowlist.legacyFiles);

function getRuleBaseline(relativePath) {
  const explicit = normalizedAllowlist.ruleBaselines[relativePath]?.[RULE_ID];
  if (typeof explicit === 'number') {
    return explicit;
  }

  if (legacyFileSet.has(relativePath)) {
    return 0;
  }

  return 0;
}

function toProjectRelativePath(fileName) {
  return path.relative(appRoot, fileName).split(path.sep).join('/');
}

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
    schema: [],
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
    const baseline = process.env.STYLE_GUARD_IGNORE_BASELINE === '1' ? 0 : getRuleBaseline(relativePath);
    let seenViolations = 0;
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

        seenViolations += 1;
        if (seenViolations > baseline) {
          context.report({
            node,
            messageId: 'noNewStyleSheetCreate',
          });
        }
      },
    };
  },
};
