import { useConfirmDialogStore } from '../confirmDialogStore';

describe('confirmDialogStore', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('stores a confirm dialog request when shown', () => {
    const store = useConfirmDialogStore.getState();

    store.show({
      title: '删除这段记忆？',
      message: '删除后无法恢复。',
      dismissible: false,
      dedupeKey: 'delete-entry',
      actions: [
        { label: '取消', role: 'secondary' },
        { label: '删除', role: 'danger' },
      ],
    });

    expect(useConfirmDialogStore.getState().current).toEqual({
      title: '删除这段记忆？',
      message: '删除后无法恢复。',
      dismissible: false,
      dedupeKey: 'delete-entry',
      actions: [
        { label: '取消', role: 'secondary' },
        { label: '删除', role: 'danger' },
      ],
    });
    expect(useConfirmDialogStore.getState().activeDedupeKey).toBe('delete-entry');
  });

  it('dedupes repeated requests with the same dedupeKey while visible', () => {
    const store = useConfirmDialogStore.getState();

    store.show({
      title: '删除这段记忆？',
      message: '第一次请求',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });

    store.show({
      title: '删除这段记忆？',
      message: '第二次请求',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });

    expect(useConfirmDialogStore.getState().current?.message).toBe('第一次请求');
  });

  it('does not replace the current dialog when a different dedupeKey is shown while visible', () => {
    const store = useConfirmDialogStore.getState();

    store.show({
      title: '删除这段记忆？',
      message: '第一次请求',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });

    const shown = store.show({
      title: '离开编辑页？',
      message: '第二次请求',
      dedupeKey: 'leave-editor',
      actions: [{ label: '离开', role: 'primary' }],
    });

    expect(shown).toBe(false);
    expect(useConfirmDialogStore.getState().current).toEqual({
      title: '删除这段记忆？',
      message: '第一次请求',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });
    expect(useConfirmDialogStore.getState().activeDedupeKey).toBe('delete-entry');
  });

  it('clears current state when dismissed', () => {
    const store = useConfirmDialogStore.getState();

    store.show({
      title: '离开编辑页？',
      message: '未保存内容将会丢失。',
      dedupeKey: 'leave-editor',
      actions: [
        { label: '继续编辑', role: 'secondary' },
        { label: '离开', role: 'primary' },
      ],
    });

    store.dismiss();

    expect(useConfirmDialogStore.getState().current).toBeNull();
    expect(useConfirmDialogStore.getState().activeDedupeKey).toBeNull();
  });
});
