import React from 'react';
import { DetailPageShell } from './DetailPageShell';
import { TagManagementPageContent } from './tag-management-page/TagManagementPageContent';
import { useTagManagementController } from './tag-management-page/useTagManagementController';

interface TagManagementPageProps {
  visible: boolean;
  onClose: () => void;
}

export function TagManagementPage({ visible, onClose }: TagManagementPageProps) {
  const {
    tags,
    inputValue,
    setInputValue,
    dragState,
    dragTranslationY,
    atLimit,
    containerHeight,
    handleAdd,
    handleDelete,
    handleReset,
    createPanResponderConfig,
  } = useTagManagementController({ visible });

  return (
    <DetailPageShell
      visible={visible}
      title="预制标签管理"
      onClose={onClose}
      scrollEnabled={dragState == null}
    >
      <TagManagementPageContent
        tags={tags}
        inputValue={inputValue}
        dragState={dragState}
        dragTranslationY={dragTranslationY}
        atLimit={atLimit}
        containerHeight={containerHeight}
        onInputChange={setInputValue}
        onAdd={() => {
          void handleAdd();
        }}
        onDelete={handleDelete}
        onReset={handleReset}
        createPanResponderConfig={createPanResponderConfig}
      />
    </DetailPageShell>
  );
}
