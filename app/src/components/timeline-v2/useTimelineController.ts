import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  SectionList,
} from 'react-native';
import type { Entry } from '@/src/types/entry';
import type { TimeSection, ViewMode } from './timelineTypes';
import { useTimelineEntryDetailState } from './useTimelineEntryDetailState';

interface UseTimelineControllerOptions {
  updateEntry: (id: string, updates: Partial<Entry>) => void | Promise<void>;
}

export function useTimelineController({
  updateEntry,
}: UseTimelineControllerOptions) {
  const {
    viewingEntry,
    editingEntry,
    handleViewEntry,
    handleEditEntry,
    closeViewingEntry,
    closeEditingEntry,
  } = useTimelineEntryDetailState();
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [displayMode, setDisplayMode] = useState<ViewMode>('list');
  const skipTransitionRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const [showViewToggle, setShowViewToggle] = useState(false);
  const [activeActionSheetId, setActiveActionSheetId] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<Entry, TimeSection>>(null);
  const scrollTopOpacity = useRef(new RNAnimated.Value(0)).current;
  const scrollTopScale = useRef(new RNAnimated.Value(1)).current;
  const lastScrollY = useRef(0);
  const [fabShouldHide, setFabShouldHide] = useState(false);
  const isTransitioning = viewMode !== displayMode;

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (skipTransitionRef.current) {
      skipTransitionRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDisplayMode(viewMode);
    }, 600);

    return () => clearTimeout(timer);
  }, [viewMode]);

  const handleSaveEdit = useCallback(
    async (id: string, content: string, tags: string[]) => {
      await updateEntry(id, { content, tags });
      closeEditingEntry();
    },
    [closeEditingEntry, updateEntry],
  );

  const handleSearchFocus = useCallback(() => {
    setShowSearchOverlay(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearchOverlay(false);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    if (showViewToggle && viewMode !== 'list') {
      skipTransitionRef.current = true;
      setViewMode('list');
      setDisplayMode('list');
    }

    setShowViewToggle((value) => !value);
  }, [showViewToggle, viewMode]);

  const handleActionSheetOpen = useCallback((id: string) => {
    setActiveActionSheetId(id);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const scrollDirection = offsetY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = offsetY;

      if (scrollDirection === 'down' && offsetY > 50) {
        setFabShouldHide(true);
      } else if (scrollDirection === 'up') {
        setFabShouldHide(false);
      }

      if (offsetY > 200 && !showScrollTop) {
        setShowScrollTop(true);
        RNAnimated.timing(scrollTopOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (offsetY <= 200 && showScrollTop) {
        RNAnimated.timing(scrollTopOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowScrollTop(false);
        });
      }
    },
    [scrollTopOpacity, showScrollTop],
  );

  const scrollToTop = useCallback(() => {
    sectionListRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: 0,
      animated: true,
    });
  }, []);

  const handlePressIn = useCallback(() => {
    RNAnimated.spring(scrollTopScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }, [scrollTopScale]);

  const handlePressOut = useCallback(() => {
    RNAnimated.spring(scrollTopScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scrollTopScale]);

  const revealFab = useCallback(() => {
    setFabShouldHide(false);
  }, []);

  return {
    viewingEntry,
    editingEntry,
    showSearchOverlay,
    showScrollTop,
    viewMode,
    setViewMode,
    displayMode,
    showViewToggle,
    activeActionSheetId,
    sectionListRef,
    scrollTopOpacity,
    scrollTopScale,
    fabShouldHide,
    isTransitioning,
    handleSaveEdit,
    handleSearchFocus,
    handleCloseSearch,
    handleToggleViewMode,
    handleViewEntry,
    handleEditEntry,
    handleActionSheetOpen,
    handleScroll,
    scrollToTop,
    handlePressIn,
    handlePressOut,
    closeViewingEntry,
    closeEditingEntry,
    revealFab,
  };
}
