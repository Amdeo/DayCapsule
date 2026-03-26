import React from 'react';
import { Alert, PanResponder, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { TagManagementPage } from '../TagManagementPage';

const mockLoadCommonTags = jest.fn();
const mockAddCommonTag = jest.fn();
const mockRemoveCommonTag = jest.fn();
const mockResetToDefaults = jest.fn();
const mockReorderCommonTags = jest.fn();
const responderConfigs: any[] = [];
const defaultStoreState = {
  tags: ['工作', '学习', '旅行'],
  isLoaded: true,
};

let mockStoreState = { ...defaultStoreState };

function setMockCommonTagsState(overrides: Partial<typeof defaultStoreState> = {}) {
  mockStoreState = { ...defaultStoreState, ...overrides };
}

jest.mock('@/src/store/commonTagsStore', () => ({
  DEFAULT_PRESET_TAGS: ['工作', '学习', '旅行'],
  useCommonTagsStore: () => ({
    ...mockStoreState,
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
    setMockCommonTagsState();
    jest.useFakeTimers();
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

  it('adds a preset tag from the management page', async () => {
    const screen = render(<TagManagementPage visible onClose={() => {}} />);

    fireEvent.changeText(screen.getByPlaceholderText('输入新预制标签'), '灵感');
    await act(async () => {
      fireEvent.press(screen.getByText('添加'));
    });

    expect(mockAddCommonTag).toHaveBeenCalledWith('灵感');
  });

  it('loads common tags only when visible and not loaded', () => {
    setMockCommonTagsState({ isLoaded: false });
    const screen = render(<TagManagementPage visible={false} onClose={jest.fn()} />);

    expect(mockLoadCommonTags).not.toHaveBeenCalled();
    expect(screen.getByTestId('tag-management-add-input')).toBeTruthy();

    screen.rerender(<TagManagementPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('tag-management-add-input')).toBeTruthy();
    expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
  });

  it('submits trimmed text from submitEditing and clears the input', async () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('tag-management-add-input'), '  灵感  ');
    await act(async () => {
      fireEvent(screen.getByTestId('tag-management-add-input'), 'submitEditing');
    });

    expect(mockAddCommonTag).toHaveBeenCalledWith('灵感');
    expect(screen.getByTestId('tag-management-add-input')).toHaveProp('value', '');
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
