import { Linking } from 'react-native';
import {
  buildBackupImportFailedFeedback,
  buildNotificationPermissionFeedback,
} from '../errorFeedbackPresets';

describe('errorFeedbackPresets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds notification permission feedback with a go-to-settings action', async () => {
    const feedback = buildNotificationPermissionFeedback();

    expect(feedback.title).toBe('权限不足');
    expect(feedback.actions.map((action) => action.label)).toContain('去设置');

    const action = feedback.actions.find((item) => item.label === '去设置');
    await action?.onPress?.();

    expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
  });

  it('falls back to product copy instead of leaking empty raw error text', () => {
    const feedback = buildBackupImportFailedFeedback(new Error(''));

    expect(feedback.title).toBe('导入失败');
    expect(feedback.message).toBe('无法解析备份文件，请确认格式正确。');
  });

  it('uses raw error message when it is meaningful', () => {
    const feedback = buildBackupImportFailedFeedback(new Error('ZIP 文件已损坏'));

    expect(feedback.message).toBe('ZIP 文件已损坏');
  });
});
