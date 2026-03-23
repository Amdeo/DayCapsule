/**
 * FABMenu - 智能记忆 FAB
 * 单击触发上次操作；长按 300ms 后扇形展开，拖动到选项松手触发。
 */

import React from 'react';
import type { PhotoResult } from '@/src/services/photoService';
import { FABMenuView } from './fab-menu/FABMenuView';
import { useFABMenuController } from './fab-menu/useFABMenuController';

interface FABMenuProps {
  onSelect: (type: 'text' | 'photo' | 'voice', photos?: PhotoResult[]) => void;
  shouldHide?: boolean;
  onRevealRequest?: () => void;
}

export function FABMenu({ onSelect, shouldHide, onRevealRequest }: FABMenuProps) {
  const controller = useFABMenuController({
    onSelect,
    shouldHide,
    onRevealRequest,
  });

  return (
    <FABMenuView {...controller} onCloseFan={controller.closeFan} />
  );
}
