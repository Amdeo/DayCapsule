import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { BackupExportSheet } from '../BackupExportSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('BackupExportSheet', () => {
  const baseProps = {
    visible: true,
    fileName: 'backup_2026-03-17.zip',
    onSaveToFiles: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export actions when visible', () => {
    const { getByText, queryByText } = render(<BackupExportSheet {...baseProps} />);

    expect(getByText('保存到文件')).toBeTruthy();
    expect(getByText('取消')).toBeTruthy();
    expect(queryByText('发送到微信')).toBeNull();
    expect(queryByText('更多方式')).toBeNull();
  });

  it('triggers the save and close callbacks', () => {
    const { getByTestId } = render(<BackupExportSheet {...baseProps} />);

    fireEvent.press(getByTestId('backup-export-save'));
    fireEvent.press(getByTestId('backup-export-cancel'));

    expect(baseProps.onSaveToFiles).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
