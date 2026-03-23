module.exports = {
  // legacy 存量文件清单（迁移完成后从此移除）
  legacyFiles: [
    'app/(tabs)/_layout.tsx',
    'app/(tabs)/two.tsx',
    'app/+not-found.tsx',
    'app/_layout.tsx',
    'app/modal.tsx',
    'src/components/BackupPage.tsx',
    'src/components/BottomToolbar.tsx',
    'src/components/CalendarTimelineItem.tsx',
    'src/components/CalendarView.tsx',
    'src/components/ErrorBoundary.tsx',
    'src/components/FilterBar.tsx',
    'src/components/ImageViewer.tsx',
    'src/components/PhotoGrid.tsx',
    'src/components/StatsPage.tsx',
    'src/components/VoiceRecorder.tsx',
    'src/components/WaveformAnimation.tsx',
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
    'src/components/BackupPage.tsx': {
      'style-guard/no-new-stylesheet-create': ['e6ca82d91c49'],
      'style-guard/no-static-inline-styles': [
        '04347ac02df9',
        '4adebc775824',
        '320cdc180a8e',
        'a3bb2dd84e4e',
        'b7a22c6eb59d',
        'b1baf9ff670e',
      ],
    },
    'src/components/BottomToolbar.tsx': {
      'style-guard/no-new-stylesheet-create': ['a38d9a0970b6'],
      'style-guard/no-static-inline-styles': [],
    },
    'src/components/CalendarTimelineItem.tsx': {
      'style-guard/no-new-stylesheet-create': ['40bd43c4b3c9'],
      'style-guard/no-static-inline-styles': ['0d4e214a5925'],
    },
    'src/components/CalendarView.tsx': {
      'style-guard/no-new-stylesheet-create': ['d2620efc2aff'],
      'style-guard/no-static-inline-styles': ['530a3dd3ea67'],
    },
    'src/components/ErrorBoundary.tsx': {
      'style-guard/no-new-stylesheet-create': ['440908eff410'],
      'style-guard/no-static-inline-styles': [],
    },
    'src/components/FilterBar.tsx': {
      'style-guard/no-new-stylesheet-create': ['df42cb1b0649'],
      'style-guard/no-static-inline-styles': ['320cdc180a8e', 'b971ed9161de'],
    },
    'src/components/ImageViewer.tsx': {
      'style-guard/no-new-stylesheet-create': ['d5c476a36901'],
      'style-guard/no-static-inline-styles': ['320cdc180a8e'],
    },
    'src/components/PhotoGrid.tsx': {
      'style-guard/no-new-stylesheet-create': ['e61b82be335d'],
      'style-guard/no-static-inline-styles': [],
    },
    'src/components/StatsPage.tsx': {
      'style-guard/no-new-stylesheet-create': ['ab19677eb9c6'],
      'style-guard/no-static-inline-styles': [],
    },
    'src/components/VoiceRecorder.tsx': {
      'style-guard/no-new-stylesheet-create': ['ab721f944770'],
      'style-guard/no-static-inline-styles': ['601d8ff9b02a'],
    },
    'src/components/WaveformAnimation.tsx': {
      'style-guard/no-new-stylesheet-create': ['9dbcfd23249c'],
      'style-guard/no-static-inline-styles': [],
    },
  },
};
