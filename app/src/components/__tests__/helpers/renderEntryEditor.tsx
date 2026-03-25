import React, { ComponentProps } from 'react';
import { render } from '@testing-library/react-native';
import { EntryEditor } from '../../EntryEditor';
import { Entry } from '@/src/types/entry';

type EntryEditorProps = ComponentProps<typeof EntryEditor>;

const defaultEntry: Entry = {
  id: 'text-entry-1',
  type: 'text',
  content: '今天重新看了下这版时间流，感觉还是要把卡片收回主页体系里。',
  tags: ['产品', '想法'],
  timestamp: new Date('2026-03-16T11:11:00+08:00').getTime(),
  syncStatus: 'synced',
};

export function renderEntryEditor(overrides: Partial<EntryEditorProps> = {}) {
  const props: EntryEditorProps = {
    visible: true,
    entry: defaultEntry,
    onSave: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  return {
    entry: props.entry ?? defaultEntry,
    props,
    screen: render(<EntryEditor {...props} />),
  };
}
