import React from 'react';
import { AboutPage } from '../AboutPage';
import { BackupPage } from '../BackupPage';
import { HelpPage } from '../HelpPage';
import { SettingsPage } from '../SettingsPage';
import { StatsPage } from '../StatsPage';
import { TagsPage } from '../TagsPage';

interface SidebarPagesProps {
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  showAbout: boolean;
  setShowAbout: (value: boolean) => void;
  showStats: boolean;
  setShowStats: (value: boolean) => void;
  showTags: boolean;
  setShowTags: (value: boolean) => void;
  showBackup: boolean;
  setShowBackup: (value: boolean) => void;
  showHelp: boolean;
  setShowHelp: (value: boolean) => void;
}

export function SidebarPages({
  showSettings,
  setShowSettings,
  showAbout,
  setShowAbout,
  showStats,
  setShowStats,
  showTags,
  setShowTags,
  showBackup,
  setShowBackup,
  showHelp,
  setShowHelp,
}: SidebarPagesProps) {
  return (
    <>
      <SettingsPage visible={showSettings} onClose={() => setShowSettings(false)} />
      <AboutPage visible={showAbout} onClose={() => setShowAbout(false)} />
      <StatsPage visible={showStats} onClose={() => setShowStats(false)} />
      <TagsPage visible={showTags} onClose={() => setShowTags(false)} />
      <BackupPage visible={showBackup} onClose={() => setShowBackup(false)} />
      <HelpPage visible={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
