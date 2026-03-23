import React from 'react';
import { Linking } from 'react-native';
import { DetailPageShell } from './DetailPageShell';
import { AboutPageContent } from './about-page/AboutPageContent';

interface AboutPageProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutPage({ visible, onClose }: AboutPageProps) {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <DetailPageShell visible={visible} title="关于" onClose={onClose}>
      <AboutPageContent onOpenLink={handleOpenLink} />
    </DetailPageShell>
  );
}
