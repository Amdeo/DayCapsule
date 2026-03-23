const crypto = require('node:crypto');
const path = require('node:path');
const allowlist = require('../eslint/style-guard-allowlist');

const appRoot = path.resolve(__dirname, '..');

function toProjectRelativePath(fileName) {
  return path.relative(appRoot, fileName).split(path.sep).join('/');
}

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

function buildActiveBaselineConfig(ruleOptions) {
  const normalizedProduction = normalizeAllowlist(allowlist);
  const normalizedRuntime = normalizeAllowlist(ruleOptions || {});

  return {
    legacyFiles: Array.from(new Set([...normalizedProduction.legacyFiles, ...normalizedRuntime.legacyFiles])),
    ruleBaselines: {
      ...normalizedProduction.ruleBaselines,
      ...normalizedRuntime.ruleBaselines,
    },
  };
}

function normalizeSnippet(snippet) {
  return snippet.replace(/\s+/g, ' ').trim();
}

function createFingerprint(snippet) {
  return crypto.createHash('sha1').update(normalizeSnippet(snippet)).digest('hex').slice(0, 12);
}

function createFingerprintBudget(fingerprintList) {
  const budget = new Map();
  for (const fingerprint of fingerprintList) {
    budget.set(fingerprint, (budget.get(fingerprint) || 0) + 1);
  }
  return budget;
}

function consumeFromBudget(budget, fingerprint) {
  const left = budget.get(fingerprint) || 0;
  if (left <= 0) {
    return false;
  }
  budget.set(fingerprint, left - 1);
  return true;
}

function extractRuleBaseline(ruleBaselines, relativePath, ruleId) {
  const entry = ruleBaselines[relativePath]?.[ruleId];
  if (!entry) {
    return [];
  }

  if (Array.isArray(entry)) {
    return entry;
  }

  if (typeof entry === 'number') {
    // 兼容旧格式，便于平滑迁移到实例级 baseline。
    return [];
  }

  return [];
}

module.exports = {
  toProjectRelativePath,
  buildActiveBaselineConfig,
  createFingerprint,
  createFingerprintBudget,
  consumeFromBudget,
  extractRuleBaseline,
};
