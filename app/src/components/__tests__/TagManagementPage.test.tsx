import React from 'react';
import { View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { TagManagementPage } from '../TagManagementPage';
import { MAX_TAGS } from '../tag-management-page/tagManagementConfig';

const mockShowConfirmDialog = jest.fn();
const mockShowErrorFeedback = jest.fn();

const mockLoadCommonTags = jest.fn();
const mockAddCommonTag = jest.fn();
const mockRemoveCommonTag = jest.fn();
const mockResetToDefaults = jest.fn();
const mockReorderCommonTags = jest.fn();

const defaultStoreState = {
  tags: ['工作', '学习', '旅行'],
  isLoaded: true,
};

let mockStoreState = { ...defaultStoreState };
let capturedOnDragEnd: ((params: { data: string[]; from: number; to: number }) => void) | null = null;

function setMockCommonTagsState(overrides: Partial<typeof defaultStoreState> = {}) {
  mockStoreState = { ...defaultStoreState, ...overrides };
}

function pressLatestConfirmButton(text: string) {
  const actions = mockShowConfirmDialog.mock.calls.at(-1)?.[0]?.actions ?? [];
  actions.find((button: { label?: string }) => button.label === text)?.onPress?.();
}

function resetTagManagementMocks() {
  jest.clearAllMocks();
  capturedOnDragEnd = null;
  setMockCommonTagsState();
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

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: (...args: unknown[]) => mockShowErrorFeedback(...args),
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

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    DraggableFlatList: ({
      data,
      renderItem,
      onDragEnd,
    }: {
      data: string[];
      renderItem: (params: { item: string; getIndex: () => number; drag: () => void; isActive: boolean }) => React.ReactNode;
      onDragEnd: (params: { data: string[]; from: number; to: number }) => void;
    }) => {
      capturedOnDragEnd = onDragEnd;
      return (
        <View>
          {data.map((item: string, index: number) =>
            renderItem({ item, getIndex: () => index, drag: jest.fn(), isActive: false }),
          )}
        </View>
      );
    },
    ScaleDecorator: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('TagManagementPage preset tags', () => {
  beforeEach(() => {
    resetTagManagementMocks();
    setMockCommonTagsState({ tags: ['工作', '学习', '旅行'], isLoaded: true });
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

  it('loads common tags only when visible and not loaded', () => {
    setMockCommonTagsState({ isLoaded: false });
    const screen = render(<TagManagementPage visible={false} onClose={jest.fn()} />);

    expect(mockLoadCommonTags).not.toHaveBeenCalled();

    screen.rerender(<TagManagementPage visible onClose={jest.fn()} />);

    expect(mockLoadCommonTags).toHaveBeenCalledTimes(1);
  });

  it('adds a preset tag from the management page', async () => {
    const screen = render(<TagManagementPage visible onClose={() => {}} />);

    fireEvent.changeText(screen.getByTestId('tag-management-add-input'), '灵感');
    await act(async () => {
      fireEvent.press(screen.getByTestId('tag-management-add-button'));
    });

    expect(mockAddCommonTag).toHaveBeenCalledWith('灵感');
    expect(screen.getByTestId('tag-management-add-input')).toHaveProp('value', '');
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

  it('does not call addCommonTag when pressing add with empty input', async () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('tag-management-add-button'));
    });

    expect(mockAddCommonTag).not.toHaveBeenCalled();
  });

  it('does not call addCommonTag when the input only contains whitespace', async () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('tag-management-add-input'), '   ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('tag-management-add-button'));
    });

    expect(mockAddCommonTag).not.toHaveBeenCalled();
    expect(screen.getByTestId('tag-management-add-input')).toHaveProp('value', '   ');
  });

  it('disables the input and add button when preset tags reach MAX_TAGS', () => {
    setMockCommonTagsState({ tags: Array.from({ length: MAX_TAGS }, (_, index) => `标签${index}`) });
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    expect(screen.getByTestId('tag-management-add-input')).toHaveProp('editable', false);
    expect(screen.getByTestId('tag-management-add-button')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByPlaceholderText(`最多 ${MAX_TAGS} 个预制标签`)).toBeTruthy();
  });

  it('shows error feedback and does not add tags when preset tags already reach MAX_TAGS', async () => {
    setMockCommonTagsState({ tags: Array.from({ length: MAX_TAGS }, (_, index) => `标签${index}`) });
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);
    const input = screen.getByTestId('tag-management-add-input');

    act(() => {
      input.props.onChangeText('灵感');
    });

    await act(async () => {
      await input.props.onSubmitEditing();
    });

    expect(mockAddCommonTag).not.toHaveBeenCalled();
    expect(mockShowErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
      title: '已达上限',
      message: `最多 ${MAX_TAGS} 个预制标签`,
    }));
  });

  it('cancels and confirms delete through confirm dialog actions', () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('preset-tag-delete-0'));
    pressLatestConfirmButton('取消');
    expect(mockRemoveCommonTag).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('preset-tag-delete-0'));
    pressLatestConfirmButton('删除');
    expect(mockRemoveCommonTag).toHaveBeenCalledWith('工作');
  });

  it('cancels and confirms reset to default preset tags through confirm dialog actions', () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('tag-management-reset-button'));
    pressLatestConfirmButton('取消');
    expect(mockResetToDefaults).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('tag-management-reset-button'));
    pressLatestConfirmButton('恢复');
    expect(mockResetToDefaults).toHaveBeenCalledTimes(1);
  });

  it('reorders preset tags when onDragEnd is called with different from/to', async () => {
    render(<TagManagementPage visible onClose={() => {}} />);

    await act(async () => {
      capturedOnDragEnd?.({ data: ['学习', '旅行', '工作'], from: 0, to: 2 });
    });

    expect(mockReorderCommonTags).toHaveBeenCalledWith(0, 2);
  });

  it('does not reorder when from equals to', async () => {
    render(<TagManagementPage visible onClose={jest.fn()} />);

    await act(async () => {
      capturedOnDragEnd?.({ data: ['工作', '学习', '旅行'], from: 1, to: 1 });
    });

    expect(mockReorderCommonTags).not.toHaveBeenCalled();
  });
});
