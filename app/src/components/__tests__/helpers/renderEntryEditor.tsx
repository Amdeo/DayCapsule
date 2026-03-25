import React from 'react';
import { render } from '@testing-library/react-native';
import { EntryEditor } from '../../EntryEditor';
import { Entry } from '@/src/types/entry';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

export const mockSuggestTags = jest.fn(() => ['复盘']);
export const mockLoadCommonTags = jest.fn();

jest.mock('@/src/services/tagSuggestionService', () => ({
  suggestTags: (...args: unknown[]) => mockSuggestTags(...args),
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['产品', '想法', '复盘'],
    isLoaded: true,
    loadCommonTags: mockLoadCommonTags,
  }),
}));

type EntryEditorProps = React.ComponentProps<typeof EntryEditor>;

export const defaultEntry: Entry = {
  id: 'text-entry-1',
  type: 'text',
  content: '今天重新看了下这版时间流，感觉还是要把卡片收回主页体系里。',
  tags: ['产品', '想法'],
  timestamp: new Date('2026-03-16T11:11:00+08:00').getTime(),
  syncStatus: 'synced',
};

export function resetRenderEntryEditorMocks() {
  jest.clearAllMocks();
  mockSuggestTags.mockImplementation(() => ['复盘']);
}

export function renderEntryEditor(overrides: Partial<EntryEditorProps> = {}) {
  const props: EntryEditorProps = {
    visible: true,
    entry: defaultEntry,
    onSave: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  const rendered = render(<EntryEditor {...props} />);

  return {
    entry: props.entry,
    props,
    screen: rendered,
    ...rendered,
  };
}
