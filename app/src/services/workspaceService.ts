// app/src/services/workspaceService.ts
import {
  getCurrentServerUrl,
  getCurrentServerUrlSync,
  getServerKey,
} from '@/src/services/backendEnvironmentService';
import { useAuthStore } from '@/src/store/authStore';

const LOCAL_SCOPE = 'local';

export function buildDataScopeKey(serverUrl: string, userId: string): string {
  return `${getServerKey(serverUrl)}_${userId}`;
}

export function getCurrentDataScopeKeySync(): string {
  const serverUrl = getCurrentServerUrlSync();
  const userId = useAuthStore.getState().user?.id;
  if (!serverUrl || !userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}

export async function getCurrentDataScopeKey(): Promise<string> {
  const serverUrl = await getCurrentServerUrl();
  const userId = useAuthStore.getState().user?.id;
  if (!serverUrl || !userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}
