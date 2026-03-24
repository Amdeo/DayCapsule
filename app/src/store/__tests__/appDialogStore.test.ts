import { useAppDialogStore } from '../appDialogStore';

describe('appDialogStore', () => {
  beforeEach(() => {
    useAppDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('shows and dismisses a generic dialog request', () => {
    const store = useAppDialogStore.getState();

    store.show({
      title: '数据同步',
      blocking: true,
      actions: [
        { label: '使用云端数据', role: 'primary' },
        { label: '上传本地数据', role: 'secondary' },
        { label: '取消', role: 'secondary' },
      ],
    });

    expect(useAppDialogStore.getState().current).toMatchObject({
      title: '数据同步',
      blocking: true,
    });

    store.dismiss();

    expect(useAppDialogStore.getState().current).toBeNull();
    expect(useAppDialogStore.getState().activeDedupeKey).toBeNull();
  });

  it('dedupes repeated requests with the same dedupeKey while visible', () => {
    const store = useAppDialogStore.getState();

    store.show({
      title: '同步失败',
      message: '第一次错误',
      dedupeKey: 'sync-failed',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    store.show({
      title: '同步失败',
      message: '第二次错误',
      dedupeKey: 'sync-failed',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    expect(useAppDialogStore.getState().current?.message).toBe('第一次错误');
  });
});
