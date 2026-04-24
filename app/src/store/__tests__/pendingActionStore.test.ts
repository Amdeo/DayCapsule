import { usePendingActionStore } from '../pendingActionStore';

describe('usePendingActionStore', () => {
  beforeEach(() => {
    usePendingActionStore.setState({ openTextEditor: false });
  });

  it('has openTextEditor defaulting to false', () => {
    expect(usePendingActionStore.getState().openTextEditor).toBe(false);
  });

  it('triggerOpenTextEditor sets openTextEditor to true', () => {
    usePendingActionStore.getState().triggerOpenTextEditor();
    expect(usePendingActionStore.getState().openTextEditor).toBe(true);
  });

  it('clearOpenTextEditor sets openTextEditor to false', () => {
    usePendingActionStore.getState().triggerOpenTextEditor();
    usePendingActionStore.getState().clearOpenTextEditor();
    expect(usePendingActionStore.getState().openTextEditor).toBe(false);
  });
});
