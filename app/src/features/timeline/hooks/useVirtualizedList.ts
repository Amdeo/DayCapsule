import {useCallback, useMemo, useRef} from 'react';
import {logger} from '@services/telemetry/logger';

export interface VirtualizedListConfig {
  itemHeight: number;
  containerHeight: number;
  bufferSize?: number;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
}

export interface VirtualizedListState {
  visibleStartIndex: number;
  visibleEndIndex: number;
  offsetY: number;
}

export interface UseVirtualizedListReturn {
  visibleItems: any[];
  state: VirtualizedListState;
  handleScroll: (offsetY: number) => void;
  getItemLayout: (index: number) => {length: number; offset: number; index: number};
}

export const useVirtualizedList = (
  items: any[],
  config: VirtualizedListConfig,
): UseVirtualizedListReturn => {
  const {itemHeight, containerHeight, bufferSize = 5, onVisibleRangeChange} = config;

  const stateRef = useRef<VirtualizedListState>({
    visibleStartIndex: 0,
    visibleEndIndex: 0,
    offsetY: 0,
  });

  // 计算可见范围
  const calculateVisibleRange = useCallback(
    (offsetY: number) => {
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const startIndex = Math.max(0, Math.floor(offsetY / itemHeight) - bufferSize);
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((offsetY + containerHeight) / itemHeight) + bufferSize,
      );

      return {startIndex, endIndex, visibleCount};
    },
    [containerHeight, itemHeight, bufferSize, items.length],
  );

  // 处理滚动
  const handleScroll = useCallback(
    (offsetY: number) => {
      const {startIndex, endIndex} = calculateVisibleRange(offsetY);

      // 检查是否需要更新
      if (
        startIndex !== stateRef.current.visibleStartIndex ||
        endIndex !== stateRef.current.visibleEndIndex
      ) {
        stateRef.current = {
          visibleStartIndex: startIndex,
          visibleEndIndex: endIndex,
          offsetY,
        };

        onVisibleRangeChange?.(startIndex, endIndex);

        logger.info('Virtualized list visible range changed', {
          startIndex,
          endIndex,
          totalItems: items.length,
        });
      }
    },
    [calculateVisibleRange, onVisibleRangeChange, items.length],
  );

  // 获取可见项
  const visibleItems = useMemo(() => {
    const {visibleStartIndex, visibleEndIndex} = stateRef.current;
    return items.slice(visibleStartIndex, visibleEndIndex + 1).map((item, index) => ({
      ...item,
      _virtualIndex: visibleStartIndex + index,
    }));
  }, [items]);

  // 获取项的布局信息
  const getItemLayout = useCallback(
    (index: number) => ({
      length: itemHeight,
      offset: index * itemHeight,
      index,
    }),
    [itemHeight],
  );

  return {
    visibleItems,
    state: stateRef.current,
    handleScroll,
    getItemLayout,
  };
};

// FlashList 集成辅助函数
export const createFlashListConfig = (itemHeight: number) => ({
  estimatedItemSize: itemHeight,
  overrideItemLayout: (layout: any, item: any) => {
    layout.size = itemHeight;
  },
});

// 性能优化建议
export const getVirtualizationRecommendations = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
) => {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const bufferSize = Math.max(5, Math.ceil(visibleCount / 2));
  const estimatedTotalHeight = itemCount * itemHeight;

  return {
    shouldVirtualize: itemCount > 50,
    recommendedBufferSize: bufferSize,
    estimatedTotalHeight,
    visibleCount,
    recommendations: [
      itemCount > 1000 ? '数据量很大，建议使用虚拟滚动' : null,
      itemHeight > 200 ? '项目高度较大，虚拟滚动效果显著' : null,
      bufferSize < 3 ? '缓冲区过小，可能导致闪烁' : null,
    ].filter(Boolean),
  };
};

