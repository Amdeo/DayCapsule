const RULE_ID = 'style-guard/no-static-inline-styles';
const {
  toProjectRelativePath,
  buildActiveBaselineConfig,
  createFingerprint,
  createFingerprintBudget,
  consumeFromBudget,
  extractRuleBaseline,
} = require('./baseline');

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
    schema: [
      {
        type: 'object',
        additionalProperties: true,
      },
    ],
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
    const baselineConfig = buildActiveBaselineConfig(context.options[0]);
    const baselineFingerprints =
      process.env.STYLE_GUARD_IGNORE_BASELINE === '1'
        ? []
        : extractRuleBaseline(baselineConfig.ruleBaselines, relativePath, RULE_ID);
    const fingerprintBudget = createFingerprintBudget(baselineFingerprints);
    const sourceCode = context.sourceCode;
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
          const fingerprint = createFingerprint(sourceCode.getText(node.value));
          if (consumeFromBudget(fingerprintBudget, fingerprint)) {
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
