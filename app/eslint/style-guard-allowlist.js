module.exports = {
  // legacy 存量文件清单（迁移完成后从此移除）
  legacyFiles: [
    'app/(tabs)/_layout.tsx',
    'app/(tabs)/index.tsx',
    'app/(tabs)/two.tsx',
    'app/+not-found.tsx',
    'app/_layout.tsx',
    'app/modal.tsx',
    'src/components/AboutPage.tsx',
    'src/components/BackupExportSheet.tsx',
    'src/components/BackupPage.tsx',
    'src/components/BottomToolbar.tsx',
    'src/components/CalendarTimelineItem.tsx',
    'src/components/CalendarView.tsx',
    'src/components/CloudSyncStatusButton.tsx',
    'src/components/DetailPageShell.tsx',
    'src/components/EntryActionSheet.tsx',
    'src/components/EntryCard.tsx',
    'src/components/EntryEditor.tsx',
    'src/components/ErrorBoundary.tsx',
    'src/components/FABMenu.tsx',
    'src/components/FilterBar.tsx',
    'src/components/HelpPage.tsx',
    'src/components/ImageViewer.tsx',
    'src/components/LoginPage.tsx',
    'src/components/PhotoGrid.tsx',
    'src/components/SearchBar.tsx',
    'src/components/SearchOverlay.tsx',
    'src/components/SettingsPage.tsx',
    'src/components/Sidebar.tsx',
    'src/components/StatsPage.tsx',
    'src/components/TagManagementPage.tsx',
    'src/components/TagsPage.tsx',
    'src/components/TextEditor.tsx',
    'src/components/TextEntryDetailPage.tsx',
    'src/components/Timeline.v2.tsx',
    'src/components/VoiceRecorder.tsx',
    'src/components/WaveformAnimation.tsx',
  ],
  // 按文件+按规则记录现存基线次数，仅用于“存量放行”
  ruleBaselines: {
    'app/(tabs)/_layout.tsx': {
      'style-guard/no-new-stylesheet-create': 0,
      'style-guard/no-static-inline-styles': 1,
    },
    'app/(tabs)/index.tsx': {
      'style-guard/no-new-stylesheet-create': 0,
      'style-guard/no-static-inline-styles': 2,
    },
    'app/(tabs)/two.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'app/+not-found.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'app/_layout.tsx': {
      'style-guard/no-new-stylesheet-create': 0,
      'style-guard/no-static-inline-styles': 1,
    },
    'app/modal.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/AboutPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/BackupExportSheet.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/BackupPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 6,
    },
    'src/components/BottomToolbar.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/CalendarTimelineItem.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 1,
    },
    'src/components/CalendarView.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 1,
    },
    'src/components/CloudSyncStatusButton.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/DetailPageShell.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/EntryActionSheet.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/EntryCard.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 3,
    },
    'src/components/EntryEditor.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/ErrorBoundary.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/FABMenu.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/FilterBar.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 2,
    },
    'src/components/HelpPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/ImageViewer.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 1,
    },
    'src/components/LoginPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/PhotoGrid.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/SearchBar.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/SearchOverlay.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 4,
    },
    'src/components/SettingsPage.tsx': {
      'style-guard/no-new-stylesheet-create': 3,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/Sidebar.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 1,
    },
    'src/components/StatsPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/TagManagementPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/TagsPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/TextEditor.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/TextEntryDetailPage.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/components/Timeline.v2.tsx': {
      'style-guard/no-new-stylesheet-create': 2,
      'style-guard/no-static-inline-styles': 13,
    },
    'src/components/VoiceRecorder.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 1,
    },
    'src/components/WaveformAnimation.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 0,
    },
    'src/__style_guard_tests__/allowlisted-baseline.tsx': {
      'style-guard/no-new-stylesheet-create': 1,
      'style-guard/no-static-inline-styles': 1,
    },
  },
};
