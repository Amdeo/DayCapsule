import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentServerUrl,
  getRecentServerUrls,
  isServerUrlNotConfiguredError,
  normalizeServerUrl,
} from '@/src/services/backendEnvironmentService';
import { testBackendConnection } from '@/src/services/backendConnectionService';
import { switchBackendEnvironment } from '@/src/services/localEnvironmentDataManager';

interface UseSettingsPageBackendServerOptions {
  visible: boolean;
}

interface SaveBackendServerResult {
  switched: boolean;
  currentServerUrl: string;
}

export function useSettingsPageBackendServer({ visible }: UseSettingsPageBackendServerOptions) {
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [backendDraftUrl, setBackendDraftUrl] = useState('');
  const [recentServerUrls, setRecentServerUrls] = useState<string[]>([]);
  const [backendTestStatus, setBackendTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [backendTestedUrl, setBackendTestedUrl] = useState<string | null>(null);
  const [backendTestErrorMessage, setBackendTestErrorMessage] = useState<string | null>(null);
  const [isSavingBackendServer, setIsSavingBackendServer] = useState(false);

  const loadBackendState = useCallback(async () => {
    const nextRecentServerUrls = await getRecentServerUrls();
    let nextCurrentServerUrl = '';

    try {
      nextCurrentServerUrl = await getCurrentServerUrl();
    } catch (error) {
      if (!isServerUrlNotConfiguredError(error)) {
        throw error;
      }
    }

    setCurrentServerUrl(nextCurrentServerUrl);
    setBackendDraftUrl(nextCurrentServerUrl);
    setRecentServerUrls(nextRecentServerUrls);
    setBackendTestStatus('idle');
    setBackendTestedUrl(null);
    setBackendTestErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void loadBackendState();
  }, [loadBackendState, visible]);

  const handleBackendDraftUrlChange = useCallback((value: string) => {
    setBackendDraftUrl(value);
    setBackendTestStatus('idle');
    setBackendTestedUrl(null);
    setBackendTestErrorMessage(null);
  }, []);

  const handleSelectRecentBackendServer = useCallback((url: string) => {
    setBackendDraftUrl(url);
    setBackendTestStatus('idle');
    setBackendTestedUrl(null);
    setBackendTestErrorMessage(null);
  }, []);

  const handleTestBackendServer = useCallback(async () => {
    setBackendTestStatus('testing');
    setBackendTestErrorMessage(null);

    const result = await testBackendConnection(backendDraftUrl);
    if (!result.success) {
      setBackendTestStatus('error');
      setBackendTestedUrl(null);
      setBackendTestErrorMessage(result.message ?? '连接失败，请检查地址或网络');
      return;
    }

    setBackendTestStatus('success');
    setBackendTestedUrl(normalizeServerUrl(backendDraftUrl));
  }, [backendDraftUrl]);

  const canSaveBackendServer = useMemo(() => {
    if (backendTestStatus !== 'success' || !backendTestedUrl) {
      return false;
    }

    try {
      return normalizeServerUrl(backendDraftUrl) === backendTestedUrl;
    } catch {
      return false;
    }
  }, [backendDraftUrl, backendTestStatus, backendTestedUrl]);

  const handleSaveBackendServer = useCallback(async (): Promise<SaveBackendServerResult | null> => {
    if (!canSaveBackendServer) {
      return null;
    }

    setIsSavingBackendServer(true);
    try {
      const result = await switchBackendEnvironment(backendDraftUrl);
      await loadBackendState();
      setBackendTestStatus('success');
      setBackendTestedUrl(result.currentServerUrl);
      return result;
    } catch (error) {
      setBackendTestStatus('error');
      setBackendTestErrorMessage((error as Error).message ?? '切换失败');
      throw error;
    } finally {
      setIsSavingBackendServer(false);
    }
  }, [backendDraftUrl, canSaveBackendServer, loadBackendState]);

  return {
    currentServerUrl,
    backendDraftUrl,
    recentServerUrls,
    backendTestStatus,
    backendTestErrorMessage,
    isSavingBackendServer,
    canSaveBackendServer,
    handleBackendDraftUrlChange,
    handleTestBackendServer,
    handleSaveBackendServer,
    handleSelectRecentBackendServer,
  };
}
