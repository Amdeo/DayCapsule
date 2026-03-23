import React from 'react';
import { Entry } from '@/src/types/entry';
import { DetailPageShell } from './DetailPageShell';
import { TextEntryDetailContent } from './text-entry-detail-page/TextEntryDetailContent';
import { TextEntryDetailEditButton } from './text-entry-detail-page/TextEntryDetailEditButton';
import { textEntryDetailPageStyles as styles } from './text-entry-detail-page/TextEntryDetailPage.styles';
import { useTextEntryDetailPageController } from './text-entry-detail-page/useTextEntryDetailPageController';

interface TextEntryDetailPageProps {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
  onEdit: (entry: Entry) => void;
}

export function TextEntryDetailPage({
  visible,
  entry,
  onClose,
  onEdit,
}: TextEntryDetailPageProps) {
  const detail = useTextEntryDetailPageController({ entry, onEdit });

  if (!visible || !detail) {
    return null;
  }

  return (
    <DetailPageShell
      visible={visible}
      title="记录详情"
      onClose={onClose}
      contentContainerStyle={styles.contentContainer}
      headerRight={<TextEntryDetailEditButton onPress={detail.handleEdit} />}
    >
      <TextEntryDetailContent
        content={detail.content}
        createdAt={detail.createdAt}
        editedAt={detail.editedAt}
        tags={detail.tags}
      />
    </DetailPageShell>
  );
}
