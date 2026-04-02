import { showConfirmDialog } from '../showConfirmDialog';
import { useConfirmDialogStore } from '@/src/store/confirmDialogStore';

describe('showConfirmDialog', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('returns true when the request is shown', () => {
    const shown = showConfirmDialog({
      title: '删除这段记忆？',
      message: '删除后无法恢复。',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });

    expect(shown).toBe(true);
    expect(useConfirmDialogStore.getState().current).toEqual({
      title: '删除这段记忆？',
      message: '删除后无法恢复。',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });
  });

  it('returns false when a dialog is already visible and keeps the current request', () => {
    showConfirmDialog({
      title: '删除这段记忆？',
      message: '第一次请求',
      dedupeKey: 'delete-entry',
      actions: [{ label: '删除', role: 'danger' }],
    });

    const shown = showConfirmDialog({
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
  });
});
