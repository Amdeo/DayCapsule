import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { TextEntryDetailPage } from '../TextEntryDetailPage';

let latestSelectableTextBodyProps: Record<string, unknown> | undefined;

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('@/src/services/tagSuggestionService', () => ({
  suggestTags: jest.fn(() => []),
}));

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: jest.fn(),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['工作', '学习', '心情'],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

jest.mock('../text-entry-detail-page/SelectableTextBody', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    SelectableTextBody: (props: Record<string, unknown>) => {
      latestSelectableTextBodyProps = props;
      return (
        <Text
          selectable
          testID={typeof props.testID === 'string' ? props.testID : 'text-entry-detail-content'}
        >
          {typeof props.content === 'string' ? props.content : ''}
        </Text>
      );
    },
  };
});

jest.mock('../DetailPageShell', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    DetailPageShell: ({
      visible,
      title,
      headerLeft,
      headerRight,
      children,
      footerContent,
    }: {
      visible: boolean;
      title: string;
      headerLeft?: React.ReactNode;
      headerRight?: React.ReactNode;
      children: React.ReactNode;
      footerContent?: React.ReactNode;
    }) => {
      if (!visible) return null;
      return (
        <View>
          <Text>{title}</Text>
          {headerLeft ? <View testID="mock-header-left">{headerLeft}</View> : null}
          {headerRight ? <View testID="mock-header-right">{headerRight}</View> : null}
          <View>{children}</View>
          {footerContent ? <View testID="mock-footer">{footerContent}</View> : null}
        </View>
      );
    },
  };
});

describe('TextEntryDetailPage', () => {
  const entry: Entry = {
    id: 'entry-text-1',
    type: 'text',
    content: '一段用于详情页的文本内容',
    timestamp: new Date('2026-03-23T08:30:00+08:00').getTime(),
    editedAt: new Date('2026-03-23T09:45:00+08:00').getTime(),
    tags: ['旅行', '春天'],
    syncStatus: 'synced',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    latestSelectableTextBodyProps = undefined;
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it('returns null when hidden or entry is null', () => {
    const hidden = render(
      <TextEntryDetailPage visible={false} entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    const empty = render(
      <TextEntryDetailPage visible entry={null} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(hidden.queryByTestId('text-entry-detail-root')).toBeNull();
    expect(empty.queryByTestId('text-entry-detail-root')).toBeNull();
  });

  it('renders read-mode with content, tags, and meta', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    const root = screen.getByTestId('text-entry-detail-root');
    const childTestIds = root.children
      .map((child: any) => child?.props?.testID)
      .filter(Boolean);

    expect(childTestIds).toEqual([
      'text-entry-detail-top-meta',
      'text-entry-detail-hero',
      'text-entry-detail-tags',
      'text-entry-detail-meta',
    ]);
    expect(screen.getByTestId('text-entry-detail-hero')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-top-meta')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-created-at')).toBeTruthy();
    expect(screen.getByText(entry.content)).toBeTruthy();
    expect(latestSelectableTextBodyProps).toMatchObject({
      content: entry.content,
      testID: 'text-entry-detail-content',
    });
    expect(screen.getByTestId('text-entry-detail-content').props.selectable).toBe(true);
    expect(screen.getByTestId('text-entry-detail-tags')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
    expect(screen.getByText('#春天')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-meta')).toBeTruthy();
    expect(screen.getByText(/最近编辑：/)).toBeTruthy();
    expect(screen.getByText('文字记录')).toBeTruthy();
  });

  it('routes selectable behavior only through the read-mode body boundary', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );

    expect(latestSelectableTextBodyProps).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-created-at').props.selectable).toBeUndefined();
    expect(screen.getByText('#旅行').props.selectable).toBeUndefined();
  });

  it('hides tags section when entry has no tags', () => {
    const screen = render(
      <TextEntryDetailPage
        visible
        entry={{ ...entry, tags: [] }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(screen.queryByTestId('text-entry-detail-tags')).toBeNull();
  });

  it('keeps editedAt in the lower meta section when it exists', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );

    expect(screen.getByTestId('text-entry-detail-top-meta').findByProps({
      testID: 'text-entry-detail-created-at',
    })).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-meta')).toBeTruthy();
    expect(screen.getByText(/最近编辑：/)).toBeTruthy();
  });

  it('hides the lower meta section when editedAt is absent', () => {
    const screen = render(
      <TextEntryDetailPage
        visible
        entry={{ ...entry, editedAt: undefined }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    expect(screen.getByTestId('text-entry-detail-top-meta')).toBeTruthy();
    expect(screen.queryByTestId('text-entry-detail-meta')).toBeNull();
  });

  it('pressing edit button enters editing mode', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    expect(screen.getByTestId('text-entry-detail-edit-input')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-edit-input').props.value).toBe(entry.content);
    expect(screen.getByText('编辑')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-save-button')).toBeTruthy();
    expect(screen.queryByTestId('mock-header-left')).toBeNull();
    expect(screen.queryByTestId('mock-header-right')).toBeNull();
  });

  it('cancel without changes exits editing without confirmation', () => {
    const { showConfirmDialog } = require('@/src/services/showConfirmDialog');
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.press(screen.getByTestId('text-entry-detail-cancel-button'));
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(screen.getByText('文字记录')).toBeTruthy();
    expect(screen.queryByTestId('text-entry-detail-edit-input')).toBeNull();
  });

  it('cancel with changes shows confirm dialog', () => {
    const { showConfirmDialog } = require('@/src/services/showConfirmDialog');
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.changeText(screen.getByTestId('text-entry-detail-edit-input'), '修改后的内容');
    fireEvent.press(screen.getByTestId('text-entry-detail-cancel-button'));
    expect(showConfirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: '放弃修改？' })
    );
  });

  it('save button calls onSave with current content and tags', async () => {
    const onSave = jest.fn().mockResolvedValueOnce(undefined);
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={onSave} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.changeText(screen.getByTestId('text-entry-detail-edit-input'), '修改后的内容');
    await act(async () => {
      fireEvent.press(screen.getByTestId('text-entry-detail-save-button'));
    });
    expect(onSave).toHaveBeenCalledWith(entry.id, '修改后的内容', entry.tags);
    expect(screen.queryByTestId('text-entry-detail-edit-input')).toBeNull();
  });

  it('shows error feedback and stays in edit mode when save fails', async () => {
    const { showErrorFeedback } = require('@/src/services/showErrorFeedback');
    const onSave = jest.fn().mockRejectedValueOnce(new Error('network error'));
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={onSave} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.changeText(screen.getByTestId('text-entry-detail-edit-input'), '修改后的内容');
    await act(async () => {
      fireEvent.press(screen.getByTestId('text-entry-detail-save-button'));
    });
    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: '保存失败' })
    );
    expect(screen.getByTestId('text-entry-detail-edit-input')).toBeTruthy();
  });
});
