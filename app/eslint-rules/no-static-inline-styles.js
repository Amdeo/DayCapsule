const path = require('node:path');
const allowlist = require('../eslint/style-guard-allowlist');

const appRoot = path.resolve(__dirname, '..');
const allowlistSet = new Set(allowlist);

function toProjectRelativePath(fileName) {
  return path.relative(appRoot, fileName).split(path.sep).join('/');
}

function isStaticLiteral(node) {
  if (!node) {
    return false;
  }

  if (node.type === 'Literal') {
    return true;
  }

  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }

  if ((node.type === 'UnaryExpression' || node.type === 'TSUnaryExpression') && node.argument) {
    return isStaticLiteral(node.argument);
  }

  return false;
}

function isStaticObjectExpression(node) {
  if (node.type !== 'ObjectExpression') {
    return false;
  }

  return node.properties.every((property) => {
    if (property.type !== 'Property' || property.computed) {
      return false;
    }

    return isStaticStyleValue(property.value);
  });
}

function isStaticArrayExpression(node) {
  if (node.type !== 'ArrayExpression') {
    return false;
  }

  return node.elements.some((element) => {
    if (!element) {
      return false;
    }
    if (element.type === 'SpreadElement') {
      return false;
    }

    return isStaticStyleExpression(element);
  });
}

function isStaticStyleValue(node) {
  if (!node) {
    return false;
  }

  if (isStaticLiteral(node)) {
    return true;
  }

  if (node.type === 'ObjectExpression') {
    return isStaticObjectExpression(node);
  }

  if (node.type === 'ArrayExpression') {
    return node.elements.every((element) => {
      if (!element || element.type === 'SpreadElement') {
        return false;
      }
      return isStaticStyleValue(element);
    });
  }

  return false;
}

function isStaticStyleExpression(node) {
  if (!node) {
    return false;
  }

  if (node.type === 'ObjectExpression') {
    return isStaticObjectExpression(node);
  }

  if (node.type === 'ArrayExpression') {
    return isStaticArrayExpression(node);
  }

  if (node.type === 'ConditionalExpression') {
    return isStaticStyleExpression(node.consequent) && isStaticStyleExpression(node.alternate);
  }

  if (node.type === 'LogicalExpression' && node.operator === '&&') {
    return isStaticStyleExpression(node.right);
  }

  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow static inline style objects that should be className or style tokens.',
    },
    schema: [],
    messages: {
      noStaticInlineStyles:
        '禁止静态内联 style 对象。请改用 className，或保留为动画/运行时驱动样式。',
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
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') {
          return;
        }
        if (!node.value || node.value.type !== 'JSXExpressionContainer') {
          return;
        }

        if (isStaticStyleExpression(node.value.expression)) {
          context.report({
            node: node.value,
            messageId: 'noStaticInlineStyles',
          });
        }
      },
    };
  },
};
