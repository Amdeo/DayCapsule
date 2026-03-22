const path = require('node:path');
const allowlist = require('../eslint/style-guard-allowlist');

const appRoot = path.resolve(__dirname, '..');
const RULE_ID = 'style-guard/no-static-inline-styles';

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

  if (node.type === 'Identifier') {
    return false;
  }

  if (node.type === 'ObjectExpression') {
    return isStaticObjectExpression(node);
  }

  if (node.type === 'ArrayExpression') {
    return isStaticArrayExpression(node);
  }

  if (node.type === 'ConditionalExpression') {
    const consequentStatic = isStaticStyleExpression(node.consequent);
    const alternateStatic = isStaticStyleExpression(node.alternate);
    const consequentNullish =
      node.consequent.type === 'Literal' && (node.consequent.value === null || node.consequent.value === false);
    const alternateNullish =
      node.alternate.type === 'Literal' && (node.alternate.value === null || node.alternate.value === false);
    return (consequentStatic && alternateStatic) || (consequentStatic && alternateNullish) || (alternateStatic && consequentNullish);
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
    const baseline = process.env.STYLE_GUARD_IGNORE_BASELINE === '1' ? 0 : getRuleBaseline(relativePath);
    let seenViolations = 0;
    const staticStyleIdentifiers = new Set();
    const nonStaticStyleIdentifiers = new Set();

    function isStaticStyleExpressionWithIdentifiers(node) {
      if (!node) {
        return false;
      }

      if (node.type === 'Identifier') {
        if (/animated/i.test(node.name)) {
          return false;
        }
        if (nonStaticStyleIdentifiers.has(node.name)) {
          return false;
        }
        return staticStyleIdentifiers.has(node.name);
      }

      return isStaticStyleExpression(node);
    }

    return {
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== 'Identifier' || !node.init) {
          return;
        }

        if (isStaticStyleExpression(node.init)) {
          staticStyleIdentifiers.add(node.id.name);
          return;
        }

        nonStaticStyleIdentifiers.add(node.id.name);
      },
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') {
          return;
        }
        if (!node.value || node.value.type !== 'JSXExpressionContainer') {
          return;
        }

        if (isStaticStyleExpressionWithIdentifiers(node.value.expression)) {
          seenViolations += 1;
          if (seenViolations <= baseline) {
            return;
          }
          context.report({
            node: node.value,
            messageId: 'noStaticInlineStyles',
          });
        }
      },
    };
  },
};
