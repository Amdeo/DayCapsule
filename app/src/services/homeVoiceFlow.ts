/**
 * 首页语音录制流程
 * 包含录音的开始、结束、错误处理完整流程，以及相关 DI 接口和测试辅助函数
 */

import { Linking } from 'react-native';
import type { Entry, MediaInfo } from '@/src/types/entry';
import type { VoiceEntryPreparationError, PreparedVoiceEntryMedia } from '@/src/services/voiceEntryPreparationService';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { logger } from '@/src/utils/logger';

export interface VoiceCloudStartDeps {
  now?: () => number;
  startRecording: () => Promise<unknown>;
  createLocalEntry: (entry: Omit<Entry, 'id' | 'timestamp'>) => Promise<Entry>;
}

export interface VoiceCloudFinalizeDeps {
  stopRecording: () => Promise<{ uri: string; size: number; duration: number; mimeType: string }>;
  prepareVoiceEntryMedia: (
    entryId: string,
    audioFile: { uri: string; size: number; duration: number; mimeType: string }
  ) => Promise<PreparedVoiceEntryMedia>;
  updateLocalEntry: (entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  deleteLocalFile: (uri: string) => Promise<void>;
  enqueueUpload: (entryId: string) => void;
  preloadAudio: (uri: string) => Promise<void>;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }
  return typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : undefined;
}

export function clearRecordingTimerForTest(
  timerRef: { current: ReturnType<typeof setInterval> | null }
): void {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

export function assertCanStartVoiceRecordingForTest(currentRecordingId: string | null): void {
  if (!currentRecordingId) return;
  const error = new Error('ACTIVE_RECORDING_IN_PROGRESS') as Error & { code?: string };
  error.code = 'ACTIVE_RECORDING_IN_PROGRESS';
  throw error;
}

export function readErrorCodeForTest(error: unknown): string | undefined {
  return getErrorCode(error);
}

export async function handleVoiceRecordingStartErrorForTest(
  error: unknown,
  createdEntryId: string | null,
  deleteEntry: (entryId: string) => Promise<void>
): Promise<boolean> {
  const errorCode = getErrorCode(error);

  if (errorCode === 'ACTIVE_RECORDING_IN_PROGRESS') {
    showErrorFeedback({
      title: '录音进行中',
      message: '请先完成当前录音，再开始新的录音。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    return true;
  }

  if (createdEntryId) {
    try {
      await deleteEntry(createdEntryId);
    } catch (e) {
      logger.error('[HomeScreen] Failed to clean up failed recording entry:', e);
    }
  }

  if (errorCode === 'PERMISSION_DENIED') {
    showConfirmDialog({
      title: '需要麦克风权限',
      message: '请在系统设置中允许 DayCapsule 访问麦克风，才能录制语音。',
      actions: [
        { label: '取消', role: 'secondary' },
        {
          label: '去设置',
          role: 'primary',
          onPress: () => Linking.openURL('app-settings:'),
        },
      ],
    });
    return true;
  }

  return false;
}

function toDisplayedRecordingDuration(duration: number): number {
  return Math.max(0, Math.floor(duration));
}

export function createRecordingDurationPoller({
  entryId,
  getRecordingDuration,
  updateRecordingDuration,
}: {
  entryId: string;
  getRecordingDuration: () => Promise<number>;
  updateRecordingDuration: (entryId: string, duration: number) => void;
}): () => Promise<void> {
  let lastDisplayedDuration = -1;

  return async () => {
    const duration = await getRecordingDuration();
    const displayedDuration = toDisplayedRecordingDuration(duration);
    if (displayedDuration !== lastDisplayedDuration) {
      lastDisplayedDuration = displayedDuration;
      updateRecordingDuration(entryId, displayedDuration);
    }
  };
}

function buildTemporaryVoiceEntry(now: number): Entry {
  return {
    id: String(now),
    type: 'voice',
    content: '',
    timestamp: now,
    syncStatus: 'pending_upload',
    localReadyState: 'processing',
    recordingStatus: 'recording',
    recordingDuration: 0,
    media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
  };
}

export async function startCloudVoiceRecordingForTest(deps: VoiceCloudStartDeps): Promise<Entry> {
  await deps.startRecording();
  const now = deps.now?.() ?? Date.now();
  const entry = buildTemporaryVoiceEntry(now);
  return deps.createLocalEntry({
    type: entry.type,
    content: entry.content,
    syncStatus: entry.syncStatus,
    localReadyState: entry.localReadyState,
    recordingStatus: entry.recordingStatus,
    recordingDuration: entry.recordingDuration,
    media: entry.media,
  });
}

export async function finalizeCloudVoiceRecordingForTest(
  entryId: string,
  deps: VoiceCloudFinalizeDeps
): Promise<void> {
  await deps.updateLocalEntry(entryId, { recordingStatus: 'stopping' });

  let audioFile: Awaited<ReturnType<typeof deps.stopRecording>>;
  try {
    audioFile = await deps.stopRecording();
  } catch (error) {
    await deps.deleteEntry(entryId).catch(() => {});
    throw error;
  }

  let preparedCreatedFiles: string[] = [];
  let preparedMedia: MediaInfo[] = [];
  try {
    const prepared = await deps.prepareVoiceEntryMedia(entryId, audioFile);
    preparedCreatedFiles = prepared.createdFiles;
    preparedMedia = prepared.media;
  } catch (error) {
    const createdFiles = (error as VoiceEntryPreparationError).createdFiles ?? [];
    await Promise.all(createdFiles.map((uri) => deps.deleteLocalFile(uri)));
    await deps.deleteEntry(entryId).catch(() => {});
    throw error;
  }

  try {
    await deps.updateLocalEntry(entryId, {
      recordingStatus: 'completed',
      localReadyState: 'ready',
      syncStatus: 'pending_upload',
      recordingDuration: Math.floor(audioFile.duration),
      media: preparedMedia,
    });
  } catch (error) {
    await Promise.all(preparedCreatedFiles.map((uri) => deps.deleteLocalFile(uri)));
    await deps.deleteEntry(entryId).catch(() => {});
    throw error;
  }

  deps.preloadAudio(preparedMedia[0]?.uri ?? '').catch((err) => {
    logger.warn('[HomeScreen] Failed to preload audio:', err);
  });

  try {
    deps.enqueueUpload(entryId);
  } catch (error) {
    logger.warn('[HomeScreen] Failed to enqueue voice upload:', error);
  }
}
