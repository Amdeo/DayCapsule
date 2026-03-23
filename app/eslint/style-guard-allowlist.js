module.exports = {
  // legacy 存量文件清单（迁移完成后从此移除）
  legacyFiles: [
    'app/_layout.tsx',
  ],
  // 按文件+按规则记录实例级 fingerprint baseline，仅放行现存违规实例
  ruleBaselines: {
    'app/_layout.tsx': {
      'style-guard/no-new-stylesheet-create': [],
      'style-guard/no-static-inline-styles': ['320cdc180a8e'],
    },
  },
};
