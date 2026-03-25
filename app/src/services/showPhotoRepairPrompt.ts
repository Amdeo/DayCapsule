import { Alert } from 'react-native';

import type { MediaRepairIssue } from '@/src/services/cloudMediaSyncService';
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

export function showPhotoRepairPrompt(): void {
  const issue = getNextRepairIssue();
  if (!issue) {
    return;
  }

  const promptKey = getPromptKey(issue);
  activePromptKeys.add(promptKey);

  const dismissPrompt = () => {
    useMediaRepairStore.getState().dismissIssue(issue.entryId, issue.localMediaId);
    activePromptKeys.delete(promptKey);
  };

  Alert.alert(
    '发现云端媒体异常',
    '检测到云端图片内容异常，可使用本地原图重新上传修复。',
    [
      {
        text: '稍后处理',
        style: 'cancel',
        onPress: () => {
          dismissPrompt();
        },
      },
      {
        text: '立即修复',
        onPress: async () => {
          try {
            await createPhotoRepairService().repair(issue);
          } finally {
            dismissPrompt();
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
