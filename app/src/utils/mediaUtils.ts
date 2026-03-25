import type { MediaInfo } from '@/src/types/entry';

/**
 * 归一化从云端接收的 MediaInfo 项。
 * 当 uri 是来源设备的本地路径（file:// 或绝对路径）且 remoteUri 存在时，
 * 将 uri 替换为 remoteUri，确保在当前设备上可以正常显示。
 */
export function normalizeCloudMediaItem(item: MediaInfo): MediaInfo {
  const isLocalPath =
    item.uri.startsWith('file://') ||
    (item.uri.startsWith('/') && !item.uri.startsWith('//'));

  if (isLocalPath && item.remoteUri) {
    return { ...item, uri: item.remoteUri };
  }
  return item;
}
