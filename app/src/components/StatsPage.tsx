import React from 'react';
import { DetailPageShell } from './DetailPageShell';
import { StatsPageContent } from './stats-page/StatsPageContent';

interface StatsPageProps {
  visible: boolean;
  onClose: () => void;
}

export function StatsPage({ visible, onClose }: StatsPageProps) {
  return (
    <DetailPageShell visible={visible} title="统计" onClose={onClose}>
      <StatsPageContent />
    </DetailPageShell>
  );
}
