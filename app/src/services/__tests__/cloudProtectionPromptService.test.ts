const mockShowConfirmDialog = jest.fn();

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

import { promptEnableCloudProtection } from '../cloudProtectionPromptService';

describe('promptEnableCloudProtection', () => {
  beforeEach(() => {
    mockShowConfirmDialog.mockReset();
    mockShowConfirmDialog.mockReturnValue(true);
  });

  it('shows confirm dialog and wires primary/secondary actions', () => {
    const onEnable = jest.fn();
    const onSkip = jest.fn();

    promptEnableCloudProtection({ onEnable, onSkip });

    expect(mockShowConfirmDialog).toHaveBeenCalledTimes(1);

    const [request] = mockShowConfirmDialog.mock.calls[0] as [Record<string, unknown>];
    expect(request.title).toBe('开启云同步与备份');
    expect(request.message).toEqual(expect.stringContaining('当前数据仍以本机为主'));
    expect(request.dedupeKey).toBe('enable-cloud-protection');

    const actions = request.actions as Array<Record<string, unknown>>;
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: '暂不启用',
          role: 'secondary',
          onPress: expect.any(Function),
        }),
        expect.objectContaining({
          label: '开启云同步与备份',
          role: 'primary',
          onPress: expect.any(Function),
        }),
      ])
    );

    const primaryAction = actions.find((action) => action.label === '开启云同步与备份');
    const secondaryAction = actions.find((action) => action.label === '暂不启用');

    expect(primaryAction).toBeDefined();
    expect(secondaryAction).toBeDefined();

    (primaryAction?.onPress as () => void)();
    (secondaryAction?.onPress as () => void)();

    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not fail when secondary action is pressed without onSkip', () => {
    const onEnable = jest.fn();

    promptEnableCloudProtection({ onEnable });

    const [request] = mockShowConfirmDialog.mock.calls[0] as [Record<string, unknown>];
    const actions = request.actions as Array<Record<string, unknown>>;
    const secondaryAction = actions.find((action) => action.label === '暂不启用');

    expect(() => (secondaryAction?.onPress as () => void)()).not.toThrow();
    expect(onEnable).not.toHaveBeenCalled();
  });
});
