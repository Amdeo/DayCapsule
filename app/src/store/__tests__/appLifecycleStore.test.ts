import { useAppLifecycleStore } from '../appLifecycleStore';

const resetStore = () =>
  useAppLifecycleStore.setState({ needsRestart: false });

beforeEach(() => {
  resetStore();
});

describe('appLifecycleStore', () => {
  it('initial state has needsRestart false', () => {
    expect(useAppLifecycleStore.getState().needsRestart).toBe(false);
  });

  it('triggerRestart sets needsRestart to true', () => {
    useAppLifecycleStore.getState().triggerRestart();
    expect(useAppLifecycleStore.getState().needsRestart).toBe(true);
  });

  it('clearRestart sets needsRestart to false', () => {
    useAppLifecycleStore.setState({ needsRestart: true });
    useAppLifecycleStore.getState().clearRestart();
    expect(useAppLifecycleStore.getState().needsRestart).toBe(false);
  });
});
