import React from 'react';
import { DetailPageShell } from './DetailPageShell';
import { HelpPageContent } from './help-page/HelpPageContent';

interface HelpPageProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpPage({ visible, onClose }: HelpPageProps) {
  return (
    <DetailPageShell visible={visible} title="帮助与反馈" onClose={onClose}>
      <HelpPageContent />
    </DetailPageShell>
  );
}
