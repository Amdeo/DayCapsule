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

const defaultStoreState = {
  tags: ['工作', '学习', '旅行'],
  isLoaded: true,
};

let mockStoreState = { ...defaultStoreState };

function setMockCommonTagsState(overrides: Partial<typeof defaultStoreState> = {}) {
  mockStoreState = { ...defaultStoreState, ...overrides };
}

function pressLatestAlertButton(text: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] ?? [];
  buttons.find((button: { text?: string }) => button.text === text)?.onPress?.();
}

function resetTagManagementMocks() {
  jest.clearAllMocks();
  responderConfigs.length = 0;
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
    resetTagManagementMocks();
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

  it('shows an alert and does not add tags when preset tags already reach MAX_TAGS', async () => {
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
    expect(Alert.alert).toHaveBeenCalledWith('已达上限', `最多 ${MAX_TAGS} 个预制标签`);
  });

  it('cancels and confirms delete through alert actions', () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('preset-tag-delete-0'));
    pressLatestAlertButton('取消');
    expect(mockRemoveCommonTag).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('preset-tag-delete-0'));
    pressLatestAlertButton('删除');
    expect(mockRemoveCommonTag).toHaveBeenCalledWith('工作');
  });

  it('cancels and confirms reset to default preset tags through alert actions', () => {
    const screen = render(<TagManagementPage visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('tag-management-reset-button'));
    pressLatestAlertButton('取消');
    expect(mockResetToDefaults).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('tag-management-reset-button'));
    pressLatestAlertButton('恢复');
    expect(mockResetToDefaults).toHaveBeenCalledTimes(1);
  });

  it('reorders preset tags after dragging across a row threshold', async () => {
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

  it('does not reorder when drag never crosses a row threshold', async () => {
    render(<TagManagementPage visible onClose={jest.fn()} />);

    act(() => {
      responderConfigs[0].onPanResponderGrant();
      jest.advanceTimersByTime(200);
      responderConfigs[0].onPanResponderMove(null, { dy: 20 });
    });

    await act(async () => {
      await responderConfigs[0].onPanResponderRelease();
    });

    expect(mockReorderCommonTags).not.toHaveBeenCalled();
  });

  it('reorders preset tags when dragging is terminated after crossing a row threshold', async () => {
    render(<TagManagementPage visible onClose={jest.fn()} />);

    act(() => {
      responderConfigs[0].onPanResponderGrant();
      jest.advanceTimersByTime(200);
    });

    act(() => {
      responderConfigs[0].onPanResponderMove(null, { dy: 104 });
    });

    await act(async () => {
      await responderConfigs[0].onPanResponderTerminate();
    });

    expect(mockReorderCommonTags).toHaveBeenCalledWith(0, 2);
  });

  it('does not reorder when dragging is terminated before the long-press threshold is reached', async () => {
    render(<TagManagementPage visible onClose={jest.fn()} />);

    act(() => {
      responderConfigs[0].onPanResponderGrant();
      jest.advanceTimersByTime(100);
      responderConfigs[0].onPanResponderMove(null, { dy: 104 });
    });

    await act(async () => {
      await responderConfigs[0].onPanResponderTerminate();
    });

    expect(mockReorderCommonTags).not.toHaveBeenCalled();
  });
});
