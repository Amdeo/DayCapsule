const path = require('node:path');
const allowlist = require('../eslint/style-guard-allowlist');

const appRoot = path.resolve(__dirname, '..');
const allowlistSet = new Set(allowlist);

function toProjectRelativePath(fileName) {
  return path.relative(appRoot, fileName).split(path.sep).join('/');
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
    if (allowlistSet.has(relativePath)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'StyleSheet' &&
          node.callee.property &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'create'
        ) {
          context.report({
            node,
            messageId: 'noNewStyleSheetCreate',
          });
        }
      },
    };
  },
};
