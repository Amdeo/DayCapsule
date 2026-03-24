import { useErrorFeedbackStore } from '../errorFeedbackStore';
import { useAppDialogStore } from '../appDialogStore';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

describe('errorFeedbackStore', () => {
  beforeEach(() => {
    useErrorFeedbackStore.setState({
      current: null,
      activeDedupeKey: null,
    });
    useAppDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('shows and dismisses a feedback request', () => {
    const store = useErrorFeedbackStore.getState();

    store.show({
      title: '同步失败',
      message: '请检查网络连接后重试。',
      dedupeKey: 'sync-failed',
      actions: [{ label: '重试', role: 'primary' }],
    });

    expect(useErrorFeedbackStore.getState().current?.title).toBe('同步失败');
    expect(useErrorFeedbackStore.getState().activeDedupeKey).toBe('sync-failed');

    store.dismiss();

    expect(useErrorFeedbackStore.getState().current).toBeNull();
    expect(useErrorFeedbackStore.getState().activeDedupeKey).toBeNull();
  });

  it('dedupes repeated requests with the same dedupeKey while visible', () => {
    const store = useErrorFeedbackStore.getState();

    store.show({
      title: '同步失败',
      message: '第一次错误',
      dedupeKey: 'sync-failed',
      actions: [{ label: '重试', role: 'primary' }],
    });

    store.show({
      title: '同步失败',
      message: '第二次错误',
      dedupeKey: 'sync-failed',
      actions: [{ label: '重试', role: 'primary' }],
    });

    expect(useErrorFeedbackStore.getState().current?.message).toBe('第一次错误');
  });

  it('replaces the current request when dedupeKey is different', () => {
    const store = useErrorFeedbackStore.getState();

    store.show({
      title: '同步失败',
      message: '网络异常',
      dedupeKey: 'sync-failed',
      actions: [{ label: '重试', role: 'primary' }],
    });

    store.show({
      title: '保存失败',
      message: '磁盘空间不足',
      dedupeKey: 'save-failed',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    expect(useErrorFeedbackStore.getState().current?.title).toBe('保存失败');
    expect(useErrorFeedbackStore.getState().activeDedupeKey).toBe('save-failed');
  });

  it('maps error feedback requests into the generic dialog store', () => {
    showErrorFeedback({
      title: '同步失败',
      message: '请检查网络连接后重试。',
      actions: [{ label: '知道了', role: 'primary' }],
    });

    expect(useAppDialogStore.getState().current).toMatchObject({
      title: '同步失败',
      message: '请检查网络连接后重试。',
      tone: 'error',
    });
  });
});
