# Detail Page Scroll Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Android 上二级详情页内容超长时无法纵向滚动的问题，并把这套页面壳统一加固到所有同类页面。

**Architecture:** 新增一个共享的 `DetailPageShell`，统一承载 `Modal`、backdrop、右侧滑入动画、header、safe area 与 `ScrollView`。现有 `BackupPage`、`SettingsPage`、`HelpPage`、`StatsPage`、`AboutPage`、`TagsPage` 迁移到该壳层，仅保留各自业务内容；通过一个轻量组件测试锁定滚动容器和关闭交互，再用 Android 手动回归验证真实滚动行为。

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, `react-native-reanimated`, `react-native-safe-area-context`, `@testing-library/react-native`, Jest

---

## File Map

**Create:**
- `app/src/components/DetailPageShell.tsx`
- `app/src/components/__tests__/DetailPageShell.test.tsx`

**Modify:**
- `app/src/components/BackupPage.tsx`
- `app/src/components/SettingsPage.tsx`
- `app/src/components/HelpPage.tsx`
- `app/src/components/StatsPage.tsx`
- `app/src/components/AboutPage.tsx`
- `app/src/components/TagsPage.tsx`

**No change expected unless migration forces it:**
- `app/src/components/Sidebar.tsx`

**Verification commands:**
- `cd app && pnpm test --runInBand src/components/__tests__/DetailPageShell.test.tsx`
- `cd app && pnpm run typecheck`
- `cd app && pnpm test --runInBand`

---

## Chunk 1: Shared Shell Foundation

### Task 1: Add a failing test for the shared detail page shell

**Files:**
- Create: `app/src/components/__tests__/DetailPageShell.test.tsx`
- Reference: `app/jest.config.js`

- [ ] **Step 1: Create the test file with shell interaction coverage**

  Add `app/src/components/__tests__/DetailPageShell.test.tsx` with two focused tests:

  ```tsx
  import React from 'react';
  import { Text } from 'react-native';
  import { fireEvent, render } from '@testing-library/react-native';
  import { DetailPageShell } from '../DetailPageShell';

  jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 12, bottom: 8, left: 0, right: 0 }),
  }));

  describe('DetailPageShell', () => {
    it('renders title, children, and scroll container when visible', () => {
      const { getByText, getByTestId } = render(
        <DetailPageShell visible title="备份与同步" onClose={jest.fn()}>
          <Text>shell child</Text>
        </DetailPageShell>
      );

      expect(getByText('备份与同步')).toBeTruthy();
      expect(getByText('shell child')).toBeTruthy();
      expect(getByTestId('detail-page-scroll')).toBeTruthy();
    });

    it('calls onClose from backdrop and back button', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <DetailPageShell visible title="帮助" onClose={onClose}>
          <Text>body</Text>
        </DetailPageShell>
      );

      fireEvent.press(getByTestId('detail-page-back-button'));
      fireEvent.press(getByTestId('detail-page-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
  ```

- [ ] **Step 2: Run the focused test to confirm it fails**

  Run:

  ```bash
  cd app && pnpm test --runInBand src/components/__tests__/DetailPageShell.test.tsx
  ```

  Expected: FAIL with module-not-found for `../DetailPageShell` or equivalent import error.

- [ ] **Step 3: Commit the failing-test checkpoint**

  ```bash
  git add app/src/components/__tests__/DetailPageShell.test.tsx
  git commit -m "test: add detail page shell coverage"
  ```

### Task 2: Implement `DetailPageShell`

**Files:**
- Create: `app/src/components/DetailPageShell.tsx`
- Test: `app/src/components/__tests__/DetailPageShell.test.tsx`

- [ ] **Step 1: Implement the shared shell component**

  Create `app/src/components/DetailPageShell.tsx` with a minimal, reusable API:

  ```tsx
  import React, { ReactNode, useEffect, useState } from 'react';
  import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
  } from 'react-native';
  import Animated, {
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutRight,
  } from 'react-native-reanimated';
  import { Ionicons } from '@expo/vector-icons';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';

  interface DetailPageShellProps {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    contentContainerStyle?: object;
    scrollEnabled?: boolean;
  }

  export function DetailPageShell({
    visible,
    title,
    onClose,
    children,
    contentContainerStyle,
    scrollEnabled = true,
  }: DetailPageShellProps) {
    const insets = useSafeAreaInsets();
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      if (visible) {
        setShouldRender(true);
        setIsAnimating(true);
      } else {
        setIsAnimating(false);
        const timer = setTimeout(() => setShouldRender(false), 300);
        return () => clearTimeout(timer);
      }
    }, [visible]);

    if (!shouldRender) return null;

    return (
      <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
        <View style={styles.container}>
          <Pressable
            testID="detail-page-backdrop"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          >
            {isAnimating && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.backdrop}
                pointerEvents="none"
              />
            )}
          </Pressable>

          {isAnimating && (
            <Animated.View
              entering={SlideInRight.duration(300).springify()}
              exiting={SlideOutRight.duration(250)}
              style={styles.page}
            >
              <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Pressable
                  testID="detail-page-back-button"
                  onPress={onClose}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
                </Pressable>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={styles.headerSpacer} />
              </View>

              <ScrollView
                testID="detail-page-scroll"
                style={styles.content}
                contentContainerStyle={[
                  styles.contentContainer,
                  { paddingBottom: 40 + insets.bottom },
                  contentContainerStyle,
                ]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={scrollEnabled}
              >
                {children}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  }
  ```

  Add styles so the shell fills the modal without `Dimensions.get('screen').height`:

  ```tsx
  const styles = StyleSheet.create({
    container: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    page: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#4A4A4A' },
    headerSpacer: { width: 40 },
    content: { flex: 1 },
    contentContainer: { paddingHorizontal: 20 },
  });
  ```

- [ ] **Step 2: Run the focused shell test to confirm it passes**

  Run:

  ```bash
  cd app && pnpm test --runInBand src/components/__tests__/DetailPageShell.test.tsx
  ```

  Expected: PASS with 2 passing tests.

- [ ] **Step 3: Commit the shell foundation**

  ```bash
  git add app/src/components/DetailPageShell.tsx app/src/components/__tests__/DetailPageShell.test.tsx
  git commit -m "feat: add shared detail page shell"
  ```

---

## Chunk 2: Migrate All Detail Pages

### Task 3: Migrate `BackupPage` and `SettingsPage` onto the shared shell

**Files:**
- Modify: `app/src/components/BackupPage.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Reference: `app/src/components/DetailPageShell.tsx`

- [ ] **Step 1: Refactor `BackupPage.tsx` to render its body inside `DetailPageShell`**

  Replace the local `Modal` / backdrop / animation / `ScrollView` scaffold with:

  ```tsx
  import { DetailPageShell } from './DetailPageShell';

  export function BackupPage({ visible, onClose }: BackupPageProps) {
    // keep existing business state and handlers

    return (
      <DetailPageShell visible={visible} title="备份与同步" onClose={onClose}>
        <Text style={styles.sectionTitle}>本地存储</Text>
        <View style={styles.infoCard}>{/* current "本地存储" rows unchanged */}</View>
        {backupFiles.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>备份历史</Text>
            <View style={styles.infoCard}>{/* current backupFiles.map(...) block unchanged */}</View>
          </>
        )}
        <Text style={styles.sectionTitle}>iCloud 同步</Text>
        <View style={styles.iCloudCard}>{/* current iCloud explanatory copy unchanged */}</View>
      </DetailPageShell>
    );
  }
  ```

  Cleanup requirements:
- remove `Modal`, `Pressable`, `ScrollView`, `Dimensions`, `Animated` animation imports that move into the shell
- delete local `shouldRender` / `isAnimating`
- delete `SCREEN_HEIGHT`, `container`, `backdrop`, `page`, `header`, `backButton`, `headerTitle`, `content` styles
- remove the trailing spacer `View`; the shell now owns bottom padding

- [ ] **Step 2: Refactor `SettingsPage.tsx` onto `DetailPageShell` without changing settings logic**

  Keep all store reads, handlers, alerts, and `useMemo` logic. Replace only the page scaffold:

  ```tsx
  return (
    <DetailPageShell visible={visible} title="设置" onClose={onClose}>
      <Text style={styles.sectionTitle}>偏好设置</Text>
      <View style={styles.sectionCard}>{/* current preference controls unchanged */}</View>
      <Text style={styles.sectionTitle}>数据</Text>
      <View style={styles.sectionCard}>{/* current data/export/reset cards unchanged */}</View>
    </DetailPageShell>
  );
  ```

  Cleanup requirements:
- delete duplicated modal animation state
- delete `SCREEN_HEIGHT` layout styles
- preserve current section/card styles and existing action handlers

- [ ] **Step 3: Run targeted typecheck after both migrations**

  Run:

  ```bash
  cd app && pnpm run typecheck
  ```

  Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Commit the first migration batch**

  ```bash
  git add app/src/components/BackupPage.tsx app/src/components/SettingsPage.tsx
  git commit -m "refactor: move backup and settings pages to detail shell"
  ```

### Task 4: Migrate `HelpPage` and `StatsPage` onto the shared shell

**Files:**
- Modify: `app/src/components/HelpPage.tsx`
- Modify: `app/src/components/StatsPage.tsx`

- [ ] **Step 1: Refactor `HelpPage.tsx` to use `DetailPageShell`**

  Keep `FAQ` data and `FaqItem` intact. Replace only the shell:

  ```tsx
  return (
    <DetailPageShell visible={visible} title="帮助与反馈" onClose={onClose}>
      <Text style={styles.sectionTitle}>常见问题</Text>
      <View style={styles.faqList}>{/* current FAQ.map(...) output unchanged */}</View>
      <Text style={styles.sectionTitle}>联系我们</Text>
      <View style={styles.contactCard}>{/* current contact copy + mail button unchanged */}</View>
    </DetailPageShell>
  );
  ```

  Delete the local `Modal`, `Animated`, `Dimensions`, `shouldRender`, `isAnimating`, and bottom spacer.

- [ ] **Step 2: Refactor `StatsPage.tsx` to use `DetailPageShell`**

  Keep the statistics calculation logic untouched. Replace only the shared page chrome:

  ```tsx
  return (
    <DetailPageShell visible={visible} title="统计" onClose={onClose}>
      <Text style={styles.sectionTitle}>总览</Text>
      <View style={styles.grid}>{/* current StatCard grid unchanged */}</View>
      {stats.topTags.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>热门标签</Text>
          <View style={styles.infoCard}>{/* current topTags rows unchanged */}</View>
        </>
      )}
    </DetailPageShell>
  );
  ```

  Delete local shell state/styles as in Task 3.

- [ ] **Step 3: Run the focused shell test again**

  Run:

  ```bash
  cd app && pnpm test --runInBand src/components/__tests__/DetailPageShell.test.tsx
  ```

  Expected: PASS; the shared shell contract still holds after consumer migration.

- [ ] **Step 4: Commit the second migration batch**

  ```bash
  git add app/src/components/HelpPage.tsx app/src/components/StatsPage.tsx
  git commit -m "refactor: move help and stats pages to detail shell"
  ```

### Task 5: Migrate `AboutPage` and `TagsPage` to close the remaining shell gap

**Files:**
- Modify: `app/src/components/AboutPage.tsx`
- Modify: `app/src/components/TagsPage.tsx`

- [ ] **Step 1: Refactor `AboutPage.tsx` to use `DetailPageShell`**

  `AboutPage` currently has the same fixed-height modal and an even broader responder wrapper (`onResponderRelease={() => {}}`). Replace the outer shell and keep the inner content unchanged:

  ```tsx
  return (
    <DetailPageShell visible={visible} title="关于" onClose={onClose}>
      <View style={styles.logoSection}>{/* current logo/app-name/version block unchanged */}</View>
      <View style={styles.section}>{/* current feature / tech-stack / developer / links sections unchanged */}</View>
      <View style={styles.footer}>{/* current copyright block unchanged */}</View>
    </DetailPageShell>
  );
  ```

  Cleanup requirements:
- delete both responder props
- delete `SCREEN_HEIGHT` and local modal/animation state

- [ ] **Step 2: Refactor `TagsPage.tsx` to use `DetailPageShell`**

  For the empty state, keep the centered layout by passing a content container override:

  ```tsx
  const shellContentStyle = tagStats.length === 0
    ? { flexGrow: 1, justifyContent: 'center', paddingBottom: 80 + insets.bottom }
    : undefined;

  return (
    <DetailPageShell
      visible={visible}
      title="标签管理"
      onClose={onClose}
      contentContainerStyle={shellContentStyle}
    >
      {tagStats.length === 0
        ? <View style={styles.empty}>{/* current empty-state text block unchanged */}</View>
        : <View>{/* current tagStats.map(...) list unchanged */}</View>}
    </DetailPageShell>
  );
  ```

  For the non-empty list branch, remove the trailing spacer view; rely on shell padding.

- [ ] **Step 3: Run typecheck after the final page migrations**

  Run:

  ```bash
  cd app && pnpm run typecheck
  ```

  Expected: PASS with no import/style/reference errors.

- [ ] **Step 4: Commit the final migration batch**

  ```bash
  git add app/src/components/AboutPage.tsx app/src/components/TagsPage.tsx
  git commit -m "refactor: move remaining detail pages to shared shell"
  ```

---

## Chunk 3: Verification and Regression Coverage

### Task 6: Add page-level coverage for backup content rendering

**Files:**
- Create: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: Add one focused regression test for `BackupPage`**

  Create `app/src/components/__tests__/BackupPage.test.tsx`. Mock backup dependencies just enough to render history:

  ```tsx
  jest.mock('@/src/services/backupService', () => ({
    BackupService: {
      listBackups: jest.fn().mockResolvedValue([
        { name: 'backup_2026-03-16T10-00-00-000Z.zip', uri: 'file:///a.zip', sizeBytes: 1000 },
        { name: 'backup_2026-03-16T11-00-00-000Z.zip', uri: 'file:///b.zip', sizeBytes: 1000 },
        { name: 'backup_2026-03-16T12-00-00-000Z.zip', uri: 'file:///c.zip', sizeBytes: 1000 },
      ]),
      getLastBackupTime: jest.fn().mockResolvedValue(Date.now()),
    },
  }));
  ```

  Assert that when `BackupPage` is visible, both the `"备份历史"` heading and the bottom `"iCloud 同步"` heading are present after async render settles. This does not prove physical scrolling in Jest, but it does lock the structure that previously became unreachable on device.

- [ ] **Step 2: Run the focused component test suite**

  ```bash
  cd app && pnpm test --runInBand src/components/__tests__/BackupPage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 3: Commit the regression coverage**

  ```bash
  git add app/src/components/__tests__
  git commit -m "test: cover detail page scroll structure"
  ```

### Task 7: Run full verification and manual Android regression

**Files:**
- No code changes required unless verification fails

- [ ] **Step 1: Run the full Jest suite**

  Run:

  ```bash
  cd app && pnpm test --runInBand
  ```

  Expected: PASS for the existing suite plus the new detail-page tests.

- [ ] **Step 2: Run final typecheck**

  Run:

  ```bash
  cd app && pnpm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 3: Perform manual Android regression verification**

  Verify on Android emulator first, then device if available:
- open `备份与同步`, add enough backup history to exceed one screen, confirm you can scroll to `iCloud 同步`
- open `设置`, `帮助与反馈`, `统计`, `关于`, `标签管理`, confirm long content still scrolls and close interactions still work
- confirm backdrop tap and back button still close every page
- confirm right-side slide animation still feels unchanged

- [ ] **Step 4: Commit the verified implementation**

  ```bash
  git add app/src/components app/src/components/__tests__
  git commit -m "fix: harden detail page scrolling on android"
  ```
