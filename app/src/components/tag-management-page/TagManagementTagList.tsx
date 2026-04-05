import React, { useCallback } from 'react';
import DraggableFlatList, {
  type RenderItemParams,
  type DragEndParams,
} from 'react-native-draggable-flatlist';
import { TagManagementTagRow } from './TagManagementTagRow';

interface TagManagementTagListProps {
  tags: string[];
  onDelete: (tag: string) => void;
  onDragEnd: (params: DragEndParams<string>) => void;
}

export function TagManagementTagList({
  tags,
  onDelete,
  onDragEnd,
}: TagManagementTagListProps) {
  const renderItem = useCallback(
    ({ item, getIndex, drag, isActive }: RenderItemParams<string>) => (
      <TagManagementTagRow
        tag={item}
        index={getIndex() ?? 0}
        isActive={isActive}
        drag={drag}
        onDelete={onDelete}
      />
    ),
    [onDelete],
  );

  return (
    <DraggableFlatList
      testID="tag-management-tags-container"
      data={tags}
      keyExtractor={(item) => item}
      renderItem={renderItem}
      onDragEnd={onDragEnd}
      keyboardShouldPersistTaps="handled"
      scrollEnabled
      showsVerticalScrollIndicator={false}
    />
  );
}
