import React from 'react';
import { View } from 'react-native';

export const Swipeable = jest.fn(({ children, renderRightActions }: any) => {
  return React.createElement(
    View,
    null,
    children,
    renderRightActions?.(
      { interpolate: () => 0 } as any,
      { interpolate: () => 0 } as any
    )
  );
});

// 添加 close 方法到原型
Object.defineProperty(Swipeable, 'prototype', {
  value: { close: jest.fn() },
  writable: false,
});

// 重新导出其他所有导出
export * from 'react-native-gesture-handler';
