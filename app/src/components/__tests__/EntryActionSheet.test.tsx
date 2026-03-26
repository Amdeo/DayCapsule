jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>;
  return { Ionicons: MockIcon };
});

import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import renderer from 'react-test-renderer';
import { EntryActionSheet } from '../EntryActionSheet';

describe('EntryActionSheet', () => {
  const baseProps = {
    visible: false,
    entryType: 'text' as const,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(<EntryActionSheet {...baseProps} />);

    expect(queryByText('编辑')).toBeNull();
    expect(queryByText('删除')).toBeNull();
    expect(queryByText('取消')).toBeNull();
  });

  it('shows edit and delete options when visible', () => {
    const { getByText } = render(<EntryActionSheet {...baseProps} visible={true} />);

    expect(getByText('编辑')).toBeTruthy();
    expect(getByText('删除')).toBeTruthy();
    expect(getByText('取消')).toBeTruthy();
  });

  it('renders the bottom sheet panel shell when visible', () => {
    const { getByTestId } = render(<EntryActionSheet {...baseProps} visible={true} />);

    expect(getByTestId('action-sheet-panel')).toBeTruthy();
    expect(getByTestId('action-sheet-option-group')).toBeTruthy();
  });

  it('does not render a standalone type bar', () => {
    const { queryByTestId } = render(<EntryActionSheet {...baseProps} visible={true} />);

    expect(queryByTestId('action-sheet-type-bar')).toBeNull();
  });

  it('uses the entry type color on the handle', () => {
    const { getByTestId, rerender } = render(
      <EntryActionSheet {...baseProps} visible={true} entryType="text" />
    );

    expect(getByTestId('action-sheet-handle')).toHaveStyle({
      backgroundColor: '#A491D3',
    });

    rerender(<EntryActionSheet {...baseProps} visible={true} entryType="voice" />);

    expect(getByTestId('action-sheet-handle')).toHaveStyle({
      backgroundColor: '#F5A623',
    });
  });

  it('keeps the colored handle in confirm mode', () => {
    const { getByTestId } = render(
      <EntryActionSheet {...baseProps} visible={true} entryType="text" />
    );

    fireEvent.press(getByTestId('action-sheet-delete'));

    expect(getByTestId('action-sheet-handle')).toHaveStyle({
      backgroundColor: '#A491D3',
    });
  });

  it('calls onEdit without triggering onClose when edit is pressed', () => {
    const onEdit = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <EntryActionSheet {...baseProps} visible={true} onEdit={onEdit} onClose={onClose} />
    );

    fireEvent.press(getByTestId('action-sheet-edit'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows confirmation view when delete is pressed', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );

    expect(queryByText('确认删除这条记录？')).toBeNull();

    fireEvent.press(getByTestId('action-sheet-delete'));

    expect(getByText('确认删除这条记录？')).toBeTruthy();
    expect(getByText('此操作无法撤销')).toBeTruthy();
  });

  it('keeps the panel shell mounted in confirm mode', () => {
    const { getByTestId } = render(<EntryActionSheet {...baseProps} visible={true} />);

    fireEvent.press(getByTestId('action-sheet-delete'));

    expect(getByTestId('action-sheet-panel')).toBeTruthy();
    expect(getByTestId('action-sheet-handle')).toBeTruthy();
  });

  it('calls onDelete and onClose when confirm delete is pressed', () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <EntryActionSheet {...baseProps} visible={true} onDelete={onDelete} onClose={onClose} />
    );

    fireEvent.press(getByTestId('action-sheet-delete'));
    fireEvent.press(getByTestId('action-sheet-confirm-delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns to menu view when cancel is pressed in confirm view', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );

    fireEvent.press(getByTestId('action-sheet-delete'));
    expect(getByText('确认删除这条记录？')).toBeTruthy();

    fireEvent.press(getByTestId('action-sheet-confirm-cancel'));

    expect(queryByText('确认删除这条记录？')).toBeNull();
    expect(getByText('编辑')).toBeTruthy();
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <EntryActionSheet {...baseProps} visible={true} onClose={onClose} />
    );

    fireEvent.press(getByTestId('action-sheet-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when tapping the menu cancel action', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <EntryActionSheet {...baseProps} visible={true} onClose={onClose} />
    );

    fireEvent.press(getByTestId('action-sheet-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('routes modal onRequestClose to onClose', () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <EntryActionSheet {...baseProps} visible={true} onClose={onClose} />
      );
    });

    const modal = tree!.root.findByType(Modal);
    modal.props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens without using spring animations', () => {
    const springSpy = jest.spyOn(Reanimated, 'withSpring');
    const timingSpy = jest.spyOn(Reanimated, 'withTiming');

    render(<EntryActionSheet {...baseProps} visible={true} />);

    expect(timingSpy).toHaveBeenCalled();
    expect(springSpy).not.toHaveBeenCalled();
  });

  it('keeps sheet mounted until timing-based exit finishes', () => {
    const { queryByText, rerender } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );

    rerender(<EntryActionSheet {...baseProps} visible={false} />);

    expect(queryByText('编辑')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(220);
    });

    expect(queryByText('编辑')).toBeNull();
  });

  it('resets to menu view when reopened after being closed', () => {
    const { getByTestId, getByText, queryByText, rerender } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );

    fireEvent.press(getByTestId('action-sheet-delete'));
    expect(getByText('确认删除这条记录？')).toBeTruthy();

    rerender(<EntryActionSheet {...baseProps} visible={false} />);
    act(() => {
      jest.advanceTimersByTime(220);
    });
    rerender(<EntryActionSheet {...baseProps} visible={true} />);

    expect(queryByText('确认删除这条记录？')).toBeNull();
    expect(getByText('编辑')).toBeTruthy();
  });
});
