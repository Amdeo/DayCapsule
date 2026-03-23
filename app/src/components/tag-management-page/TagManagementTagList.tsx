import React from 'react';
import { Animated, PanResponder } from 'react-native';
import { TagManagementTagRow } from './TagManagementTagRow';
import { ROW_HEIGHT } from './tagManagementConfig';
import type { DragState } from './useTagManagementController';

interface TagManagementTagListProps {
  tags: string[];
  dragState: DragState | null;
  dragTranslationY: Animated.Value;
  onDelete: (tag: string) => void;
  createPanResponderConfig: (
    tag: string,
    index: number,
  ) => Parameters<typeof PanResponder.create>[0];
}

export function TagManagementTagList({
  tags,
  dragState,
  dragTranslationY,
  onDelete,
  createPanResponderConfig,
}: TagManagementTagListProps) {
  return (
    <>
      {tags.map((tag, index) => {
        const isActive = dragState?.tag === tag;
        let shiftedTop = index * ROW_HEIGHT;

        if (dragState && !isActive) {
          if (
            dragState.fromIndex < dragState.toIndex &&
            index > dragState.fromIndex &&
            index <= dragState.toIndex
          ) {
            shiftedTop -= ROW_HEIGHT;
          } else if (
            dragState.fromIndex > dragState.toIndex &&
            index >= dragState.toIndex &&
            index < dragState.fromIndex
          ) {
            shiftedTop += ROW_HEIGHT;
          }
        }

        const panResponder = PanResponder.create(createPanResponderConfig(tag, index));

        return (
          <TagManagementTagRow
            key={tag}
            tag={tag}
            index={index}
            shiftedTop={shiftedTop}
            isActive={isActive}
            dragTranslationY={dragTranslationY}
            panHandlers={panResponder.panHandlers}
            onDelete={onDelete}
          />
        );
      })}
    </>
  );
}
