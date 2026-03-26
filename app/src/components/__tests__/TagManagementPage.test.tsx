import React from 'react';
import { Alert, PanResponder, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { TagManagementPage } from '../TagManagementPage';
import { MAX_TAGS } from '../tag-management-page/tagManagementConfig';

const mockLoadCommonTags = jest.fn();
const mockAddCommonTag = jest.fn();
const mockRemoveCommonTag = jest.fn();
const mockResetToDefaults = jest.fn();
const mockReorderCommonTags = jest.fn();
const responderConfigs: any[] = [];

let mockStoreState: { tags: string[]; isLoaded: boolean } = {
  tags: ['工作', '学习', '旅行'],
  isLoaded: true,
};

function setMockCommonTagsState(next: Partial<typeof mockStoreState>) {
  mockStoreState = { ...mockStoreState, ...next };
}

jest.mock('@/src/store/commonTagsStore', () => ({
  DEFAULT_PRESET_TAGS: ['工作', '学习', '旅行'],
  useCommonTagsStore: () => ({
    tags: mockStoreState.tags,
    isLoaded: mockStoreState.isLoaded,
    loadCommonTags: mockLoadCommonTags,
    addCommonTag: mockAddCommonTag,
    removeCommonTag: mockRemoveCommonTag,
    resetToDefaults: mockResetToDefaults,
    reorderCommonTags: mockReorderCommonTags,
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text> };
});

jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children, title }: { children: React.ReactNode; title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return (
      <>
        <Text>{title}</Text>
        {children}
      </>
    );
  },
}));

describe('TagManagementPage preset tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    responderConfigs.length = 0;
    jest.useFakeTimers();
    setMockCommonTagsState({ tags: ['工作', '学习', '旅行'], isLoaded: true });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    jest.spyOn(PanResponder, 'create').mockImplementation((config: any) => {
      responderConfigs.push(config);
      return {
        panHandlers: {
          onStartShouldSetResponder: config.onStartShouldSetPanResponder,
          onMoveShouldSetResponder: config.onMoveShouldSetPanResponder,
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      } as any;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders preset tags management copy', () => {
    const screen = render(<TagManagementPage visible onClose={() => {}} />);

    expect(screen.getByTestId('tag-management-root')).toBeTruthy();
    expect(screen.getByTestId('tag-management-tags-container')).toBeTruthy();
    expect(screen.getByText('预制标签管理')).toBeTruthy();
    expect(screen.getByText('当前预制标签')).toBeTruthy();
    expect(screen.getByText('这组标签会出现在快速选择区域')).toBeTruthy();
    expect(screen.getByText('恢复初始预制标签')).toBeTruthy();
    expect(screen.getByText('#工作')).toBeTruthy();
  });

  it('does not load common tags when visible=true and isLoaded=true', () => {
    setMockCommonTagsState({ isLoaded: true });
    render(<TagManagementPage visible onClose={() => {}} />);

    expect(mockLoadCommonTags).not.toHaveBeenCalled();
  });

  it('adds a preset tag from the management page', async () => {
    const screen = render(<TagManagementPage visible onClose={() => {}} />);

    fireEvent.changeText(screen.getByPlaceholderText('输入新预制标签'), '灵感');
    await act(async () => {
      fireEvent.press(screen.getByText('添加'));
    });

    expect(mockAddCommonTag).toHaveBeenCalledWith('灵感');
  });

  it('does not add a preset tag and alerts when at limit', async () => {
    // 先在未达上限时设置 inputValue，保证输入行为稳定；再切到达上限触发 handleAdd 的保护分支。
    setMockCommonTagsState({
      tags: Array.from({ length: MAX_TAGS - 1 }, (_, i) => `标签${i + 1}`),
      isLoaded: true,
    });

    const screen = render(<TagManagementPage visible onClose={() => {}} />);
    fireEvent.changeText(screen.getByPlaceholderText('输入新预制标签'), '灵感');

    setMockCommonTagsState({
      tags: Array.from({ length: MAX_TAGS }, (_, i) => `标签${i + 1}`),
    });
    screen.rerender(<TagManagementPage visible onClose={() => {}} />);

    const input = screen.getByPlaceholderText(`最多 ${MAX_TAGS} 个预制标签`);
    await act(async () => {
      // RNTL 对 `editable={false}` 的 TextInput 可能不会触发 submitEditing 事件，
      // 这里直接调用回调以确保命中 controller 的 atLimit 分支。
      input.props.onSubmitEditing?.({ nativeEvent: { text: '灵感' } });
    });

    expect(mockAddCommonTag).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('已达上限', `最多 ${MAX_TAGS} 个预制标签`);
  });

  it('reorders preset tags after dragging the handle', async () => {
    render(<TagManagementPage visible onClose={() => {}} />);

    act(() => {
      responderConfigs[0].onPanResponderGrant();
      jest.advanceTimersByTime(200);
    });

    act(() => {
      responderConfigs[0].onPanResponderMove(null, { dy: 104 });
    });

    await act(async () => {
      await responderConfigs[0].onPanResponderRelease();
    });

    expect(mockReorderCommonTags).toHaveBeenCalledWith(0, 2);
  });
});
