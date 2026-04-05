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

  // 页头区域容器
  pageHeader: {
    flexShrink: 0,
  },

  // 分区标题区域
  sectionHeader: {
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6C6C70',
  },

  // 列表容器
  tagList: {
    flex: 1,
  },
  tagListContent: {
    paddingBottom: 8,
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

  // 计数提示（右对齐）
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 6,
    paddingRight: 16,
    paddingBottom: 8,
  },

  // 重置行
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 17,
    color: '#007AFF',
  },

  // 底部固定输入栏
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    backgroundColor: '#F2F2F7',
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 17,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
  },
  addInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#C0C0C0',
  },
  addButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#A3A3A3',
  },
} satisfies Record<string, ViewStyle | TextStyle>;
