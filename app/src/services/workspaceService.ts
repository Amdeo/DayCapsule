// app/src/services/workspaceService.ts
import {
  getCurrentServerUrl,
  getCurrentServerUrlSync,
  getServerKey,
} from '@/src/services/backendEnvironmentService';
import { Storage, withScope } from '@/src/utils/storage';

const LOCAL_SCOPE = 'local';

const getUserIdKey = (serverUrl: string): string =>
  withScope(getServerKey(serverUrl), 'workspace:currentUserId');

export function buildDataScopeKey(serverUrl: string, userId: string): string {
  return `${getServerKey(serverUrl)}_${userId}`;
}

export function getCurrentDataScopeKeySync(): string {
  const serverUrl = getCurrentServerUrlSync();
  if (!serverUrl) return LOCAL_SCOPE;
  const userId = Storage.getStringSync(getUserIdKey(serverUrl));
  if (!userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}

export async function getCurrentDataScopeKey(): Promise<string> {
  const serverUrl = await getCurrentServerUrl();
  if (!serverUrl) return LOCAL_SCOPE;
  const userId = await Storage.getString(getUserIdKey(serverUrl));
  if (!userId) return LOCAL_SCOPE;
  return buildDataScopeKey(serverUrl, userId);
}
