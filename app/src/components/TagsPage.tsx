import React from 'react';
import { DetailPageShell } from './DetailPageShell';
import { TagsPageContent } from './tags-page/TagsPageContent';
import { tagsPageStyles as styles } from './tags-page/TagsPage.styles';
import { useTagsPageController } from './tags-page/useTagsPageController';

interface TagsPageProps {
  visible: boolean;
  onClose: () => void;
}

export function TagsPage({ visible, onClose }: TagsPageProps) {
  const { isEmpty, tagStats } = useTagsPageController();
  const shellContentStyle = isEmpty ? styles.emptyContentContainer : undefined;

  return (
    <DetailPageShell
      visible={visible}
      title="标签管理"
      onClose={onClose}
      contentContainerStyle={shellContentStyle}
    >
      <TagsPageContent isEmpty={isEmpty} tagStats={tagStats} onClose={onClose} />
    </DetailPageShell>
  );
}
