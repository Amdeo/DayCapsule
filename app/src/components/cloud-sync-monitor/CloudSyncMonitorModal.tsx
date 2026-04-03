import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type {
  ActiveSyncRun,
  LastSyncRunSummary,
  SyncMonitorPhase,
} from '@/src/store/cloudSyncMonitorStore';

interface CloudSyncMonitorModalProps {
  activeRun: ActiveSyncRun | null;
  lastRunSummary: LastSyncRunSummary | null;
  lastSyncError: string | null;
  mediaValidationStatus: 'idle' | 'running' | 'success' | 'partial' | 'failed' | null;
  onSyncNow?: () => void;
  onDismiss: () => void;
}

type StepDefinition = {
  index: 1 | 2 | 3 | 4;
  phase: Exclude<SyncMonitorPhase, 'done'>;
  label: string;
  description: string;
};

const STEP_DEFINITIONS: StepDefinition[] = [
  { index: 1, phase: 'prepare', label: '准备同步', description: '检查本地变更与队列状态' },
  { index: 2, phase: 'sync-entries', label: '同步记录', description: '提交文本和结构化数据' },
  { index: 3, phase: 'upload-media', label: '上传媒体', description: '上传图片与语音文件' },
  { index: 4, phase: 'validate-media', label: '校验媒体', description: '确认媒体已在云端落地' },
];

const PHASE_LABELS: Record<SyncMonitorPhase, string> = {
  prepare: '准备同步',
  'sync-entries': '同步记录',
  'upload-media': '上传媒体',
  'validate-media': '校验媒体',
  done: '完成',
};

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSummaryStatusLabel(status: LastSyncRunSummary['status']): string {
  switch (status) {
    case 'success':
      return '已完成';
    case 'partial':
      return '部分完成';
    case 'failed':
      return '失败';
    default:
      return status;
  }
}

function getStepState(
  step: StepDefinition,
  activeRun: ActiveSyncRun
): 'completed' | 'current' | 'pending' {
  if (step.index < activeRun.phaseIndex) {
    return 'completed';
  }

  if (step.index === activeRun.phaseIndex) {
    return 'current';
  }

  return 'pending';
}

function renderStepBadge(state: 'completed' | 'current' | 'pending', index: number) {
  const className = state === 'completed'
    ? 'bg-emerald-500'
    : state === 'current'
      ? 'bg-sky-500'
      : 'bg-slate-200';
  const labelClassName = state === 'pending' ? 'text-slate-500' : 'text-white';

  return (
    <View className={`h-8 w-8 items-center justify-center rounded-full ${className}`}>
      <Text className={`text-xs font-bold ${labelClassName}`}>{index}</Text>
    </View>
  );
}

function ProgressBlock({
  title,
  completed,
  total,
  currentItemTitle,
  accentClassName,
}: {
  title: string;
  completed: number;
  total: number;
  currentItemTitle: string | null;
  accentClassName: string;
}) {
  const ratio = total > 0 ? Math.min(completed / total, 1) : 0;

  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
        <Text className="text-sm font-semibold text-slate-700">
          {title} {completed} / {total}
        </Text>
      </View>
      <View className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <View
          className={`h-full rounded-full ${accentClassName}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </View>
      <Text className="text-xs leading-5 text-slate-500">
        {currentItemTitle ? `当前：${currentItemTitle}` : '当前：等待处理下一项'}
      </Text>
    </View>
  );
}

function InProgressContent({ activeRun }: { activeRun: ActiveSyncRun }) {
  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-sky-50 p-4">
        <Text className="text-[20px] font-bold text-slate-950">正在同步到云端</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          当前阶段：{PHASE_LABELS[activeRun.phase]}，开始于 {formatTimestamp(activeRun.startedAt)}
        </Text>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="mb-4 text-sm font-semibold uppercase tracking-[1px] text-slate-500">
          四步时间线
        </Text>
        <View className="gap-4">
          {STEP_DEFINITIONS.map((step) => {
            const state = getStepState(step, activeRun);
            const stateLabel = state === 'completed'
              ? '已完成'
              : state === 'current'
                ? '进行中'
                : '待开始';

            return (
              <View key={step.phase} className="flex-row gap-3">
                {renderStepBadge(state, step.index)}
                <View className="flex-1 pb-1">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-base font-semibold text-slate-900">{step.label}</Text>
                    <Text className="text-xs font-semibold text-slate-500">{stateLabel}</Text>
                  </View>
                  <Text className="mt-1 text-sm leading-5 text-slate-500">{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <ProgressBlock
        title="记录进度"
        completed={activeRun.entryProgress.completed}
        total={activeRun.entryProgress.total}
        currentItemTitle={activeRun.entryProgress.currentItemTitle}
        accentClassName="bg-sky-500"
      />

      <ProgressBlock
        title="媒体进度"
        completed={activeRun.mediaProgress.completed}
        total={activeRun.mediaProgress.total}
        currentItemTitle={activeRun.mediaProgress.currentItemTitle}
        accentClassName="bg-emerald-500"
      />
    </View>
  );
}

function SummaryContent({ lastRunSummary }: { lastRunSummary: LastSyncRunSummary }) {
  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-emerald-50 p-4">
        <Text className="text-[20px] font-bold text-slate-950">最近一次云同步已结束</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          开始于 {formatTimestamp(lastRunSummary.startedAt)}，结束于 {formatTimestamp(lastRunSummary.finishedAt)}
        </Text>
      </View>

      <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-sm font-semibold text-slate-500">同步结果</Text>
          <Text className="text-base font-bold text-slate-900">
            {getSummaryStatusLabel(lastRunSummary.status)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-sm font-semibold text-slate-500">记录已处理</Text>
          <Text className="text-base font-bold text-slate-900">{lastRunSummary.entryProcessed}</Text>
        </View>
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-sm font-semibold text-slate-500">媒体已处理</Text>
          <Text className="text-base font-bold text-slate-900">{lastRunSummary.mediaProcessed}</Text>
        </View>
      </View>
    </View>
  );
}

function FailedContent({ lastRunSummary }: { lastRunSummary: LastSyncRunSummary }) {
  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-rose-50 p-4">
        <Text className="text-[20px] font-bold text-slate-950">最近一次云同步失败</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          失败时间：{formatTimestamp(lastRunSummary.finishedAt)}
        </Text>
      </View>

      <View className="rounded-2xl border border-rose-100 bg-white p-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-sm font-semibold text-slate-500">失败阶段</Text>
          <Text className="text-base font-bold text-slate-900">
            {lastRunSummary.failedPhase ? PHASE_LABELS[lastRunSummary.failedPhase] : '未知'}
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="mb-3 text-sm font-semibold uppercase tracking-[1px] text-slate-500">
          失败项目
        </Text>
        {lastRunSummary.failedItems.length > 0 ? (
          <View className="gap-3">
            {lastRunSummary.failedItems.map((item) => (
              <View key={item.id} className="rounded-2xl bg-slate-50 p-3">
                <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500">
                  {item.detail ?? '未提供失败详情'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm leading-5 text-slate-500">没有记录到具体失败项目。</Text>
        )}
      </View>
    </View>
  );
}

function IdleContent({
  lastSyncError,
  mediaValidationStatus,
  onSyncNow,
}: {
  lastSyncError: string | null;
  mediaValidationStatus: 'idle' | 'running' | 'success' | 'partial' | 'failed' | null;
  onSyncNow?: () => void;
}) {
  if (lastSyncError) {
    return (
      <View className="gap-4">
        <View className="rounded-2xl bg-rose-50 p-4">
          <Text className="text-[20px] font-bold text-slate-950">上次同步遇到错误</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            当前没有正在进行的同步任务。
          </Text>
        </View>
        <View className="rounded-2xl border border-rose-100 bg-white p-4">
          <Text className="mb-1 text-sm font-semibold text-slate-500">错误信息</Text>
          <Text className="text-sm leading-5 text-rose-700">{lastSyncError}</Text>
        </View>
        {onSyncNow && (
          <Pressable className="items-center rounded-2xl bg-sky-500 py-3" onPress={onSyncNow} testID="cloud-sync-now-button">
            <Text className="text-base font-semibold text-white">立即同步</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (mediaValidationStatus === 'partial' || mediaValidationStatus === 'failed') {
    return (
      <View className="gap-4">
        <View className="rounded-2xl bg-amber-50 p-4">
          <Text className="text-[20px] font-bold text-slate-950">媒体校验未完全通过</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            上次媒体校验结果为「{mediaValidationStatus === 'partial' ? '部分通过' : '失败'}」，部分文件可能未完整同步到云端。下次同步时将自动重试。
          </Text>
        </View>
        {onSyncNow && (
          <Pressable className="items-center rounded-2xl bg-sky-500 py-3" onPress={onSyncNow} testID="cloud-sync-now-button">
            <Text className="text-base font-semibold text-white">立即同步</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-slate-100 p-4">
        <Text className="text-[20px] font-bold text-slate-950">当前没有正在执行的云同步</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          你可以在同步开始后回到这里查看进度。
        </Text>
      </View>
    </View>
  );
}

export function CloudSyncMonitorModal({
  activeRun,
  lastRunSummary,
  lastSyncError,
  mediaValidationStatus,
  onSyncNow,
  onDismiss,
}: CloudSyncMonitorModalProps) {
  const content = activeRun
    ? <InProgressContent activeRun={activeRun} />
    : lastRunSummary?.status === 'failed'
      ? <FailedContent lastRunSummary={lastRunSummary} />
      : lastRunSummary
        ? <SummaryContent lastRunSummary={lastRunSummary} />
        : <IdleContent lastSyncError={lastSyncError} mediaValidationStatus={mediaValidationStatus} onSyncNow={onSyncNow} />;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 justify-end bg-black/40 px-4 pb-6 pt-16">
        <Pressable className="absolute inset-0" onPress={onDismiss} testID="cloud-sync-monitor-backdrop" />
        <View className="max-h-full rounded-[28px] bg-white px-5 pb-5 pt-4">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-slate-200" />
          </View>

          <View className="mb-4 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
                云同步监视器
              </Text>
              <Text className="mt-1 text-sm leading-5 text-slate-500">
                运行 ID：{activeRun?.runId ?? lastRunSummary?.runId ?? '暂无'}
              </Text>
            </View>
            <Pressable
              testID="cloud-sync-monitor-dismiss"
              className="rounded-full bg-slate-100 px-3 py-2"
              onPress={onDismiss}
            >
              <Text className="text-sm font-semibold text-slate-700">关闭</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
