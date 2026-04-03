import { useCallback, useEffect, useState } from 'react';
import {
  getRegisteredAccounts,
  getActiveAccountRef,
  getActiveAccountRefSync,
  type AccountEntry,
  type ActiveAccountRef,
} from '@/src/services/accountRegistryService';
import { useAuthStore } from '@/src/store/authStore';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

interface UseAccountSwitcherReturn {
  accounts: AccountEntry[];
  activeRef: ActiveAccountRef | null;
  isLoading: boolean;
  isSwitching: boolean;
  handleSwitch: (serverUrl: string, userId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAccountSwitcher(): UseAccountSwitcherReturn {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [activeRef, setActiveRef] = useState<ActiveAccountRef | null>(
    () => getActiveAccountRefSync(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const switchAccount = useAuthStore((s) => s.switchAccount);

  const load = useCallback(async () => {
    try {
      const [loadedAccounts, loadedRef] = await Promise.all([
        getRegisteredAccounts(),
        getActiveAccountRef(),
      ]);
      setAccounts(loadedAccounts);
      setActiveRef(loadedRef);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载账号列表失败';
      showErrorFeedback({ title: '加载失败', message: msg, actions: [{ label: '知道了', role: 'primary' }] });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    load().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const handleSwitch = useCallback(
    async (serverUrl: string, userId: string) => {
      setIsSwitching(true);
      try {
        await switchAccount(serverUrl, userId);
        // switchAccount 会触发 triggerRestart，app 重启后无需更新本地状态
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        showErrorFeedback({
          title: '切换失败',
          message,
          actions: [{ label: '知道了', role: 'primary' }],
        });
      } finally {
        setIsSwitching(false);
      }
    },
    [switchAccount],
  );

  return { accounts, activeRef, isLoading, isSwitching, handleSwitch, refresh };
}
