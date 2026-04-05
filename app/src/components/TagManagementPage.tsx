import React from 'react';
import { DetailPageShell } from './DetailPageShell';
import { TagManagementPageContent } from './tag-management-page/TagManagementPageContent';
import { useTagManagementController } from './tag-management-page/useTagManagementController';
import { tagManagementPageStyles as styles } from './tag-management-page/TagManagementPage.styles';

interface TagManagementPageProps {
  visible: boolean;
  onClose: () => void;
}

export function TagManagementPage({ visible, onClose }: TagManagementPageProps) {
  const {
    tags,
    inputValue,
    setInputValue,
    atLimit,
    handleAdd,
    handleDelete,
    handleReset,
    handleDragEnd,
  } = useTagManagementController({ visible });

  return (
    <DetailPageShell
      visible={visible}
      title="预制标签管理"
      onClose={onClose}
      scrollEnabled={false}
      contentContainerStyle={styles.shellContentOverride}
    >
      <TagManagementPageContent
        tags={tags}
        inputValue={inputValue}
        atLimit={atLimit}
        onInputChange={setInputValue}
        onAdd={() => {
          void handleAdd();
        }}
        onDelete={handleDelete}
        onReset={handleReset}
        onDragEnd={handleDragEnd}
      />
    </DetailPageShell>
  );
}
