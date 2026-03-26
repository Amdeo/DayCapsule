import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackupPage } from '../BackupPage';
import { SettingsPage } from '../SettingsPage';
import { StatsPage } from '../StatsPage';

const DETAIL_PAGE_EXIT_DURATION_MS = 300;

type SidebarPageKey = 'settings' | 'stats' | 'backup';

interface SidebarPagesProps {
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  showStats: boolean;
  setShowStats: (value: boolean) => void;
  showBackup: boolean;
  setShowBackup: (value: boolean) => void;
}

export function SidebarPages({
  showSettings,
  setShowSettings,
  showStats,
  setShowStats,
  showBackup,
  setShowBackup,
}: SidebarPagesProps) {
  const activePage = useMemo<SidebarPageKey | null>(() => {
    if (showSettings) return 'settings';
    if (showStats) return 'stats';
    if (showBackup) return 'backup';
    return null;
  }, [showBackup, showSettings, showStats]);

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
    case 'stats':
      return <StatsPage visible={activePage === 'stats'} onClose={() => setShowStats(false)} />;
    case 'backup':
      return <BackupPage visible={activePage === 'backup'} onClose={() => setShowBackup(false)} />;
    default:
      return null;
  }
}
