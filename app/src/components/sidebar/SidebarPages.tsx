import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AboutPage } from '../AboutPage';
import { BackupPage } from '../BackupPage';
import { HelpPage } from '../HelpPage';
import { SettingsPage } from '../SettingsPage';
import { StatsPage } from '../StatsPage';
import { TagsPage } from '../TagsPage';

const DETAIL_PAGE_EXIT_DURATION_MS = 300;

type SidebarPageKey =
  | 'settings'
  | 'about'
  | 'stats'
  | 'tags'
  | 'backup'
  | 'help';

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
  const activePage = useMemo<SidebarPageKey | null>(() => {
    if (showSettings) return 'settings';
    if (showAbout) return 'about';
    if (showStats) return 'stats';
    if (showTags) return 'tags';
    if (showBackup) return 'backup';
    if (showHelp) return 'help';
    return null;
  }, [showAbout, showBackup, showHelp, showSettings, showStats, showTags]);

  const [closingPage, setClosingPage] = useState<SidebarPageKey | null>(null);
  const lastActivePageRef = useRef<SidebarPageKey | null>(null);

  useEffect(() => {
    if (activePage) {
      lastActivePageRef.current = activePage;
      if (closingPage) {
        setClosingPage(null);
      }
      return;
    }

    const lastActivePage = lastActivePageRef.current;
    if (!lastActivePage) {
      return;
    }

    setClosingPage(lastActivePage);
    const timer = setTimeout(() => {
      setClosingPage((page) => (page === lastActivePage ? null : page));
      if (lastActivePageRef.current === lastActivePage) {
        lastActivePageRef.current = null;
      }
    }, DETAIL_PAGE_EXIT_DURATION_MS);

    return () => clearTimeout(timer);
  }, [activePage, closingPage]);

  const renderedPage = activePage ?? closingPage;
  if (!renderedPage) {
    return null;
  }

  switch (renderedPage) {
    case 'settings':
      return <SettingsPage visible={activePage === 'settings'} onClose={() => setShowSettings(false)} />;
    case 'about':
      return <AboutPage visible={activePage === 'about'} onClose={() => setShowAbout(false)} />;
    case 'stats':
      return <StatsPage visible={activePage === 'stats'} onClose={() => setShowStats(false)} />;
    case 'tags':
      return <TagsPage visible={activePage === 'tags'} onClose={() => setShowTags(false)} />;
    case 'backup':
      return <BackupPage visible={activePage === 'backup'} onClose={() => setShowBackup(false)} />;
    case 'help':
      return <HelpPage visible={activePage === 'help'} onClose={() => setShowHelp(false)} />;
    default:
      return null;
  }
}
