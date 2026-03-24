import { showAppDialog } from '../showAppDialog';
import { useAppDialogStore } from '@/src/store/appDialogStore';

describe('showAppDialog', () => {
  beforeEach(() => {
    useAppDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('shows a dialog request through the global store', () => {
    showAppDialog({
      title: '退出登录',
      blocking: true,
      actions: [
        { label: '取消', role: 'secondary' },
        { label: '退出', role: 'destructive' },
      ],
    });

    expect(useAppDialogStore.getState().current?.title).toBe('退出登录');
    expect(useAppDialogStore.getState().current?.actions).toHaveLength(2);
  });
});
