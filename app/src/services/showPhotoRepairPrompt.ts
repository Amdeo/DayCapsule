import { Alert } from 'react-native';

import type { MediaRepairIssue } from '@/src/services/cloudMediaSyncService';
import { createE2ESyncLabService } from '@/src/services/e2eSyncLabService';
import { createPhotoRepairService } from '@/src/services/photoRepairService';
import { useMediaRepairStore } from '@/src/store/mediaRepairStore';

const activePromptKeys = new Set<string>();

function getPromptKey(issue: MediaRepairIssue): string {
  return `${issue.entryId}:${issue.localMediaId ?? issue.mediaIndex}`;
}

function getNextRepairIssue(): MediaRepairIssue | null {
  const issues = useMediaRepairStore.getState().issues;
  return issues.find((issue) =>
    issue.integrityStatus === 'repair_prompt_required'
    && !activePromptKeys.has(getPromptKey(issue))
  ) ?? null;
}

function isE2ESyncLabIssue(issue: MediaRepairIssue): boolean {
  return process.env.EXPO_PUBLIC_E2E_SYNC_LAB === '1'
    && (
      issue.localMediaId?.startsWith('e2e-sync-')
      || issue.localUri.includes('/e2e-sync-lab/')
    );
}

export function showPhotoRepairPrompt(): void {
  const issue = getNextRepairIssue();
  if (!issue) {
    return;
  }

  const promptKey = getPromptKey(issue);
  activePromptKeys.add(promptKey);

  const releasePrompt = () => {
    activePromptKeys.delete(promptKey);
  };

  const resolveIssue = () => {
    useMediaRepairStore.getState().dismissIssue(issue.entryId, issue.localMediaId);
    releasePrompt();
  };

  Alert.alert(
    '发现云端媒体异常',
    '检测到云端图片内容异常，可使用本地原图重新上传修复。',
    [
      {
        text: '稍后处理',
        style: 'cancel',
        onPress: () => {
          releasePrompt();
        },
      },
      {
        text: '立即修复',
        onPress: async () => {
          try {
            if (isE2ESyncLabIssue(issue)) {
              await createE2ESyncLabService().injectRepairPending();
            } else {
              await createPhotoRepairService().repair(issue);
            }
          } finally {
            resolveIssue();
          }
        },
      },
    ],
    {
      cancelable: false,
    },
  );
}

export function resetPhotoRepairPromptForTests(): void {
  activePromptKeys.clear();
}
