import { normalizeServerUrl } from '@/src/services/backendEnvironmentService';

export interface BackendConnectionResult {
  success: boolean;
  message?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

const buildFailureResult = (message: string): BackendConnectionResult => ({
  success: false,
  message,
});

const createTimeoutController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
};

export const testBackendConnection = async (
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<BackendConnectionResult> => {
  let normalizedUrl: string;

  try {
    normalizedUrl = normalizeServerUrl(url);
  } catch (error) {
    return buildFailureResult((error as Error).message);
  }

  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(`${normalizedUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (response.ok) {
      return { success: true };
    }

    return buildFailureResult(`服务返回 ${response.status}`);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return buildFailureResult('请求超时');
    }

    return buildFailureResult((error as Error).message || '连接失败');
  } finally {
    clearTimeout(timeoutId);
  }
};
