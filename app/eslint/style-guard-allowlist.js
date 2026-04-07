module.exports = {
  // legacy 存量文件清单（迁移完成后从此移除）
  legacyFiles: [],
  // 按文件+按规则记录实例级 fingerprint baseline，仅放行现存违规实例
  ruleBaselines: {
    'src/components/EntryCard.tsx': {
      'style-guard/no-static-inline-styles': ['89a6c73a8c34'],
    },
    'src/components/Timeline.v2.tsx': {
      'style-guard/no-static-inline-styles': ['fd96c4bec4cc'],
    },
    'src/components/about-page/AboutPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['2786db0ba155'],
    },
    'src/components/backup-export-sheet/BackupExportSheet.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['1ff7fa66cf0c'],
    },
    'src/components/backup-page/BackupPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['253673ae3e47'],
    },
    'src/components/bottom-toolbar/styles.ts': {
      'style-guard/no-new-stylesheet-create': ['a38d9a0970b6'],
    },
    'src/components/calendar-timeline-item/CalendarTimelineItem.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['3f77d7f7a7e0'],
    },
    'src/components/calendar-view/CalendarView.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['247a23a52dc6'],
    },
    'src/components/calendar-view/CalendarViewGrid.tsx': {
      'style-guard/no-static-inline-styles': ['81b147e72abd'],
    },
    'src/components/cloud-sync-status-button/CloudSyncStatusButton.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['8cf6bebae4c0'],
    },
    'src/components/detail-page-shell/DetailPageShell.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['0d5810620de4'],
    },
    'src/components/entry-action-sheet/EntryActionSheet.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['048f8af90226'],
    },
    'src/components/entry-card/EntryCard.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['39b7da37800b'],
    },
    'src/components/entry-card/EntryCardCalendarVoiceSection.tsx': {
      'style-guard/no-static-inline-styles': ['34893b2d218c'],
    },
    'src/components/entry-card/EntryCardDefaultVoiceContent.tsx': {
      'style-guard/no-static-inline-styles': ['a500fec497d4'],
    },
    'src/components/entry-editor/EntryEditor.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['b5a4dfbf157b'],
    },
    'src/components/error-boundary/ErrorBoundary.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['dbc603b2c77d'],
    },
    'src/components/fab-menu/FABMenu.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['cfe05d293be8'],
    },
    'src/components/filter-bar/FilterBar.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['176472e48b49'],
    },
    'src/components/help-page/HelpPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['a3a348741075'],
    },
    'src/components/image-viewer/ImageViewer.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['db9255b9ce4d'],
    },
    'src/components/image-viewer/ImageViewerScene.tsx': {
      'style-guard/no-static-inline-styles': ['320cdc180a8e'],
    },
    'src/components/login-page/LoginPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['5b4012b1f903'],
    },
    'src/components/photo-grid/PhotoGrid.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['5a7ea7e047d8'],
    },
    'src/components/search-bar/SearchBar.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['afdebbeb141e'],
    },
    'src/components/search-overlay/SearchOverlay.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['6df0f1019f33'],
    },
    'src/components/settings-page/SettingsPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['d1e83ef72403', '424dfdf4600e', 'b2ebf5636c74'],
    },
    'src/components/sidebar/Sidebar.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['832586874d3d'],
    },
    'src/components/stats-page/StatsPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['ab1f6f6c3d67'],
    },
    'src/components/tag-management-page/TagManagementPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['e7fd3066d434'],
    },
    'src/components/tags-page/TagsPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['06e01cd7d6b9'],
    },
    'src/components/text-editor/TextEditor.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['3e6954d1ca47'],
    },
    'src/components/text-entry-detail-page/TextEntryDetailPage.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['0bbd3ceb1783'],
    },
    'src/components/timeline-v2/Timeline.v2.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['414acdfdc4c3', '3ac1de749885'],
    },
    'src/components/timeline-v2/TimelineContent.tsx': {
      'style-guard/no-static-inline-styles': ['b2eaa5039970', '2a1c162a9caa', 'c5a4d1f46e2f'],
    },
    'src/components/timeline-v2/TimelineEmptyState.tsx': {
      'style-guard/no-static-inline-styles': ['6b47cdc8f88c', 'dec87172e45e', 'f78fff9edc2c', '5637d2d9c6b4'],
    },
    'src/components/timeline-v2/TimelineEntryMarker.tsx': {
      'style-guard/no-static-inline-styles': ['88b4707bc885'],
    },
    'src/components/timeline-v2/TimelineScrollTopButton.tsx': {
      'style-guard/no-static-inline-styles': ['c55372818a75'],
    },
    'src/components/timeline-v2/TimelineSectionHeader.tsx': {
      'style-guard/no-static-inline-styles': ['9dfe2f014774', 'f81fe5d83a33'],
    },
    'src/components/timeline-v2/TimelineTransitionLoader.tsx': {
      'style-guard/no-static-inline-styles': ['34a79ade6a31', 'e422a450e9d3'],
    },
    'src/components/voice-recorder/VoiceRecorder.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['df424107723f'],
    },
    'src/components/waveform-animation/WaveformAnimation.styles.ts': {
      'style-guard/no-new-stylesheet-create': ['fbe1c87dbef5'],
    },
  },
};
