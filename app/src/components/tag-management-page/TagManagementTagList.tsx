import React, { useCallback, type ReactElement } from 'react';
import DraggableFlatList, {
  type RenderItemParams,
  type DragEndParams,
} from 'react-native-draggable-flatlist';
import { TagManagementTagRow } from './TagManagementTagRow';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';

interface TagManagementTagListProps {
  tags: string[];
  onDelete: (tag: string) => void;
  onDragEnd: (params: DragEndParams<string>) => void;
  headerContent?: ReactElement | null;
  footerContent?: ReactElement | null;
}

export function TagManagementTagList({
  tags,
  onDelete,
  onDragEnd,
  headerContent = null,
  footerContent = null,
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
      ListHeaderComponent={headerContent}
      ListFooterComponent={footerContent}
      style={styles.tagList}
      contentContainerStyle={styles.tagListContent}
      scrollEnabled
    />
  );
}
