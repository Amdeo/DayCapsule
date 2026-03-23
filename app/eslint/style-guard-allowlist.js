module.exports = {
  // legacy 存量文件清单（迁移完成后从此移除）
  legacyFiles: [
    'app/(tabs)/_layout.tsx',
    'app/(tabs)/two.tsx',
    'app/+not-found.tsx',
    'app/_layout.tsx',
    'app/modal.tsx',
    'src/components/ErrorBoundary.tsx',
  ],
  // 按文件+按规则记录实例级 fingerprint baseline，仅放行现存违规实例
  ruleBaselines: {
    'app/(tabs)/_layout.tsx': {
      'style-guard/no-new-stylesheet-create': [],
      'style-guard/no-static-inline-styles': ['03a276dde7ed'],
    },
    'app/(tabs)/two.tsx': {
      'style-guard/no-new-stylesheet-create': ['5578ba11c544'],
      'style-guard/no-static-inline-styles': [],
    },
    'app/+not-found.tsx': {
      'style-guard/no-new-stylesheet-create': ['28a5238f7fc8'],
      'style-guard/no-static-inline-styles': [],
    },
    'app/_layout.tsx': {
      'style-guard/no-new-stylesheet-create': [],
      'style-guard/no-static-inline-styles': ['320cdc180a8e'],
    },
    'app/modal.tsx': {
      'style-guard/no-new-stylesheet-create': ['5578ba11c544'],
      'style-guard/no-static-inline-styles': [],
    },
    'src/components/ErrorBoundary.tsx': {
      'style-guard/no-new-stylesheet-create': ['440908eff410'],
      'style-guard/no-static-inline-styles': [],
    },
  },
};
