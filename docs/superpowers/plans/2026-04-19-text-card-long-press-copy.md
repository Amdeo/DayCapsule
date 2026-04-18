# Text Card Long-Press Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every text entry card copy `entry.content` on long press and show a lightweight success hint without changing short-press navigation.

**Architecture:** Keep the feature centered in `EntryCard` and `useEntryCardController`. Add Expo Clipboard for the actual copy operation, introduce a tiny non-blocking transient feedback host mounted at the app root for success messages, and continue using the existing `FeedbackHost` modal path only for copy failures.

**Tech Stack:** React Native, Expo, `expo-clipboard`, Zustand, `@testing-library/react-native`, existing `showErrorFeedback` modal feedback.

**Spec:** [`docs/superpowers/specs/2026-04-19-text-card-long-press-copy-design.md`](/Users/cooper/Documents/code/MemoryCapsule/docs/superpowers/specs/2026-04-19-text-card-long-press-copy-design.md)

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `app/package.json` | Modify | Add `expo-clipboard` dependency through Expo-managed install |
| `app/pnpm-lock.yaml` | Modify | Lock resolved clipboard dependency |
| `app/src/store/transientFeedbackStore.ts` | Create | Hold the current short-lived feedback message |
| `app/src/services/showTransientFeedback.ts` | Create | Thin service for showing transient feedback |
| `app/src/components/TransientFeedbackHost.tsx` | Create | Render and auto-dismiss the non-blocking success hint |
| `app/app/_layout.tsx` | Modify | Mount `TransientFeedbackHost` next to existing app-level hosts |
| `app/src/components/__tests__/TransientFeedbackHost.test.tsx` | Create | Verify render and auto-dismiss behavior |
| `app/app/__tests__/_layout.photo-upload.test.tsx` | Modify | Verify root layout mounts the new host |
| `app/src/components/entry-card/useEntryCardController.ts` | Modify | Change text-card long press from expand to async copy + feedback |
| `app/src/components/EntryCard.tsx` | Modify | Stop rendering the legacy text expand hint |
| `app/src/components/__tests__/EntryCard.test.tsx` | Modify | Cover clipboard success/failure and non-text no-copy behavior |
| `docs/superpowers/specs/2026-04-19-text-card-long-press-copy-design.md` | Modify | Mark the spec as implemented and record verification notes after code lands |

---

### Task 1: Add the minimal transient success feedback path

**Files:**
- Create: `app/src/store/transientFeedbackStore.ts`
- Create: `app/src/services/showTransientFeedback.ts`
- Create: `app/src/components/TransientFeedbackHost.tsx`
- Create: `app/src/components/__tests__/TransientFeedbackHost.test.tsx`
- Modify: `app/app/_layout.tsx`
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [x] **Step 1: Write the failing host test**

Create `app/src/components/__tests__/TransientFeedbackHost.test.tsx`:

```tsx
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
import { TransientFeedbackHost } from '../TransientFeedbackHost';

describe('TransientFeedbackHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useTransientFeedbackStore.setState({
      currentMessage: null,
      sequence: 0,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders nothing when idle', () => {
    const screen = render(<TransientFeedbackHost />);

    expect(screen.queryByTestId('transient-feedback-host')).toBeNull();
  });

  it('renders the latest message and auto-dismisses it', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
    });

    expect(screen.getByText('已复制')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1400);
    });

    expect(screen.queryByText('已复制')).toBeNull();
  });

  it('replaces the previous message when a new one arrives', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
      showTransientFeedback('再次复制');
    });

    expect(screen.queryByText('已复制')).toBeNull();
    expect(screen.getByText('再次复制')).toBeTruthy();
  });
});
```

- [x] **Step 2: Extend the root layout test so the new host is required**

Update `app/app/__tests__/_layout.photo-upload.test.tsx`:

```tsx
const mockTransientFeedbackHost = jest.fn(() => null);
```

```tsx
jest.mock('@/src/components/TransientFeedbackHost', () => ({
  TransientFeedbackHost: () => mockTransientFeedbackHost(),
}));
```

Inside the bootstrap smoke test, add:

```tsx
expect(mockTransientFeedbackHost).toHaveBeenCalled();
```

- [x] **Step 3: Run the targeted tests and confirm they fail**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx app/__tests__/_layout.photo-upload.test.tsx
```

Expected: FAIL because `TransientFeedbackHost`, `showTransientFeedback`, and `useTransientFeedbackStore` do not exist yet.

- [x] **Step 4: Implement the transient feedback store, service, host, and root mount**

Create `app/src/store/transientFeedbackStore.ts`:

```ts
import { create } from 'zustand';

type TransientFeedbackState = {
  currentMessage: string | null;
  sequence: number;
  show: (message: string) => void;
  dismiss: () => void;
};

export const useTransientFeedbackStore = create<TransientFeedbackState>((set) => ({
  currentMessage: null,
  sequence: 0,
  show: (message) =>
    set((state) => ({
      currentMessage: message,
      sequence: state.sequence + 1,
    })),
  dismiss: () =>
    set({
      currentMessage: null,
    }),
}));
```

Create `app/src/services/showTransientFeedback.ts`:

```ts
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

export function showTransientFeedback(message: string): void {
  useTransientFeedbackStore.getState().show(message);
}
```

Create `app/src/components/TransientFeedbackHost.tsx`:

```tsx
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

const HIDE_DELAY_MS = 1400;

export function TransientFeedbackHost() {
  const insets = useSafeAreaInsets();
  const currentMessage = useTransientFeedbackStore((state) => state.currentMessage);
  const sequence = useTransientFeedbackStore((state) => state.sequence);
  const dismiss = useTransientFeedbackStore((state) => state.dismiss);

  useEffect(() => {
    if (!currentMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      dismiss();
    }, HIDE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentMessage, dismiss, sequence]);

  if (!currentMessage) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      testID="transient-feedback-host"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 16) + 20,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          borderRadius: 14,
          backgroundColor: 'rgba(34, 34, 34, 0.92)',
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {currentMessage}
        </Text>
      </View>
    </View>
  );
}
```

Update `app/app/_layout.tsx` imports and host list:

```tsx
import { TransientFeedbackHost } from '@/src/components/TransientFeedbackHost';
```

```tsx
              <TransientFeedbackHost />
              <FeedbackHost />
              <ConfirmDialogHost />
              <CloudSyncMonitorHost />
```

- [x] **Step 5: Re-run the targeted tests and confirm they pass**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx app/__tests__/_layout.photo-upload.test.tsx
```

Expected: PASS for both files.

- [x] **Step 6: Commit the transient feedback infrastructure**

Run:

```bash
git add app/app/_layout.tsx app/app/__tests__/_layout.photo-upload.test.tsx app/src/components/TransientFeedbackHost.tsx app/src/components/__tests__/TransientFeedbackHost.test.tsx app/src/services/showTransientFeedback.ts app/src/store/transientFeedbackStore.ts
git commit -F - <<'EOF'
Enable non-blocking success feedback for lightweight card actions

The existing feedback host is modal and intentionally blocking, which is a bad
fit for a one-tap success state like “copied”. This change adds the smallest
possible transient feedback path at the app root without disturbing the
existing error-feedback system.

Constraint: Copy success must be shown without blocking the current screen
Rejected: Reuse FeedbackHost for success | modal confirmation is heavier than the requested interaction
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep TransientFeedbackHost limited to short success messages; do not grow it into a full notification framework without a separate design
Tested: Targeted root-layout and transient-feedback host tests
Not-tested: Device animation feel and final visual polish
EOF
```

---

### Task 2: Switch text-card long press from expand to copy

**Files:**
- Modify: `app/package.json`
- Modify: `app/pnpm-lock.yaml`
- Modify: `app/src/components/entry-card/useEntryCardController.ts`
- Modify: `app/src/components/EntryCard.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [x] **Step 1: Add the failing EntryCard tests for clipboard behavior**

Update `app/src/components/__tests__/EntryCard.test.tsx` imports and mocks:

```tsx
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => undefined),
}));

jest.mock('@/src/services/showTransientFeedback', () => ({
  showTransientFeedback: jest.fn(),
}));
```

```tsx
import * as Clipboard from 'expo-clipboard';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
```

Replace the current long-press section with:

```tsx
describe('EntryCard long press behavior', () => {
  const photoLongPressEntry: Entry = {
    id: 'photo-long-press',
    type: 'photo',
    content: '图片说明',
    timestamp: 1700000000000,
    syncStatus: 'synced',
    media: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', size: 1000 }],
  };

  const voiceLongPressEntry: Entry = {
    id: 'voice-long-press',
    type: 'voice',
    content: '语音备注',
    timestamp: 1700000000000,
    syncStatus: 'synced',
    media: [{ uri: 'file:///voice.m4a', mimeType: 'audio/m4a', size: 2048, duration: 12000 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies text content and shows transient feedback on long press', async () => {
    render(<EntryCard entry={mockEntry} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent(screen.getByTestId('entry-card'), 'longPress');
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('测试条目内容');
    expect(showTransientFeedback).toHaveBeenCalledWith('已复制');
    expect(screen.queryByText('取消')).toBeNull();
  });

  it('shows blocking feedback when clipboard copy fails', async () => {
    (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('copy failed'));

    render(<EntryCard entry={mockEntry} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent(screen.getByTestId('entry-card'), 'longPress');
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '复制失败',
      message: '复制文本失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('does not render the legacy expand hint for long text entries', () => {
    const { queryByText } = render(<EntryCard entry={longTextEntry} onDelete={jest.fn()} />);

    expect(queryByText('点击展开更多')).toBeNull();
  });

  it('does not copy photo entries on long press', async () => {
    render(<EntryCard entry={photoLongPressEntry} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent(screen.getByTestId('entry-card'), 'longPress');
    });

    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(showTransientFeedback).not.toHaveBeenCalled();
  });

  it('does not copy voice entries on long press', async () => {
    render(<EntryCard entry={voiceLongPressEntry} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent(screen.getByTestId('entry-card'), 'longPress');
    });

    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(showTransientFeedback).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run the EntryCard test file and confirm it fails**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx
```

Expected: FAIL because the controller still expands text on long press, does not call `Clipboard.setStringAsync`, and still renders the old expand hint.

- [x] **Step 3: Install Expo Clipboard and implement the long-press copy path**

Install the dependency:

```bash
cd app && rtk npx expo install expo-clipboard
```

Expected: `app/package.json` and `app/pnpm-lock.yaml` update with Expo-managed versions.

Update `app/src/components/entry-card/useEntryCardController.ts`:

```ts
import * as Clipboard from 'expo-clipboard';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
```

Replace `handleLongPress` with:

```ts
  const handleLongPress = useCallback(async () => {
    if (entry.type !== 'text') {
      setIsExpanded(true);
      return;
    }

    try {
      await Clipboard.setStringAsync(entry.content);
      showTransientFeedback('已复制');
    } catch (error) {
      logger.error('Failed to copy text content:', error);
      showErrorFeedback({
        title: '复制失败',
        message: '复制文本失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    }
  }, [entry.content, entry.type]);
```

Update `app/src/components/EntryCard.tsx` so the old text expand hint disappears:

```tsx
  const shouldShowExpandHint =
    entry.type !== 'text' &&
    needsExpansion &&
    !isExpanded &&
    variant !== 'calendar';
```

```tsx
                {shouldShowExpandHint ? (
                  <Text style={styles.expandHint}>点击展开更多</Text>
                ) : null}
```

- [x] **Step 4: Re-run the EntryCard tests and confirm they pass**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS for the updated long-press cases and the existing card interaction suite.

- [x] **Step 5: Commit the card-copy behavior**

Run:

```bash
git add app/package.json app/pnpm-lock.yaml app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx app/src/components/entry-card/useEntryCardController.ts
git commit -F - <<'EOF'
Make text-card long press copy content instead of expanding

Text cards now use long press for the user-requested copy action, while photo
and voice cards keep their current non-copy path. Success feedback stays
lightweight through the transient host and failures remain on the existing
blocking error channel.

Constraint: Long press must copy only text-card content across timeline and calendar views
Constraint: Copy success must not use the blocking error-feedback modal
Rejected: Keep text-card long press as expand | conflicts with the approved copy interaction
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Preserve short-press detail navigation; do not add photo or voice copy behaviors in this change
Tested: Targeted EntryCard test suite
Not-tested: Device-level clipboard integration on iOS and Android
EOF
```

---

### Task 3: Run full verification and close the docs loop

**Files:**
- Modify: `docs/superpowers/specs/2026-04-19-text-card-long-press-copy-design.md`
- Modify: `docs/superpowers/plans/2026-04-19-text-card-long-press-copy.md`

- [x] **Step 1: Run the feature verification commands**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx src/components/__tests__/EntryCard.test.tsx app/__tests__/_layout.photo-upload.test.tsx
cd app && rtk pnpm run lint
cd app && rtk pnpm run typecheck
```

Expected:

- targeted tests PASS
- `pnpm run lint` exits 0
- `pnpm run typecheck` exits 0

- [x] **Step 2: Update the spec to reflect implementation completion**

Change the header in `docs/superpowers/specs/2026-04-19-text-card-long-press-copy-design.md`:

```md
**状态：** 已实现
```

Append verification notes under the review record:

```md
- 2026-04-19：实现完成，已运行 EntryCard / TransientFeedbackHost / RootLayout 目标测试、lint、typecheck
```

- [x] **Step 3: Mark completed checkboxes in this plan and record any deviations**

At the end of implementation, check off every completed step in this file. If implementation differed from the plan, add a short note under the relevant task:

```md
**Implementation note:** `TransientFeedbackHost` kept inline styles and did not need a separate style file.
```

- [x] **Step 4: Commit verification and docs closure**

Run:

```bash
git add docs/superpowers/specs/2026-04-19-text-card-long-press-copy-design.md docs/superpowers/plans/2026-04-19-text-card-long-press-copy.md
git commit -F - <<'EOF'
Record completion evidence for text-card long-press copy

The implementation is only considered done once the spec and plan reflect the
actual verification evidence. This commit closes the documentation loop and
makes the final state auditable.

Constraint: Repository process requires spec, plan, and verification evidence to stay aligned
Rejected: Leave docs in approved/planned state | would make the workflow incomplete and harder to audit
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Do not mark feature docs complete without attaching real verification evidence
Tested: Targeted tests, lint, typecheck
Not-tested: Manual device validation
EOF
```
