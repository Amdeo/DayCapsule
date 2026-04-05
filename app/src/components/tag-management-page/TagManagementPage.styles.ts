import {
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const tagManagementPageStyles = {
  // 页面容器
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // 标签行
  tagRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  tagRowActive: {
    backgroundColor: '#F7F9FC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dragHandle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagName: {
    fontSize: 17,
    color: '#1C1C1E',
  },

  // 删除按钮：红色实心圆
  deleteButton: {
    width: 22,
    height: 22,
    backgroundColor: '#FF3B30',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
    includeFontPadding: false,
  },

  // 计数提示（右对齐，列表下方）
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'right',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },

  // "添加新标签"分区标题（iOS grouped style）
  addSectionLabel: {
    fontSize: 13,
    color: '#6C6C70',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // iOS 分组卡片：白色圆角容器
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingLeft: 16,
    paddingRight: 12,
    height: 52,
  },
  addInput: {
    flex: 1,
    fontSize: 17,
    color: '#1C1C1E',
    height: 52,
    paddingVertical: 0,
  },
  addInputDisabled: {
    color: '#C0C0C0',
  },
  addButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addButtonTextDisabled: {
    color: '#C7C7CC',
  },

  // 恢复按钮行
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  resetText: {
    fontSize: 17,
    color: '#007AFF',
  },

  // 列表底部容器（含安全区域间距）
  footer: {
    paddingBottom: 40,
    backgroundColor: '#F2F2F7',
  },

  // 覆盖 DetailPageShell staticContent 的默认 padding
  shellContentOverride: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
} satisfies Record<string, ViewStyle | TextStyle>;
