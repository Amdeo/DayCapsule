# Text Card Copy Feedback Anchor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the text-card copy success hint appear near the card that triggered it, preferring the card’s upper edge and falling back below when top space is insufficient.

**Architecture:** Reuse the existing transient feedback pipeline instead of replacing it. Extend the transient feedback payload with an optional `anchorRect`, let `EntryCard` measure itself after a successful copy, and let `TransientFeedbackHost` compute anchored placement with top-first / bottom-fallback / horizontal clamp behavior while preserving the existing no-anchor fallback.

**Tech Stack:** React Native, Expo, `expo-clipboard`, Zustand, `@testing-library/react-native`, existing `TransientFeedbackHost` / `showTransientFeedback` / `EntryCard` interaction flow.

**Spec:** [`docs/superpowers/specs/2026-04-19-text-card-copy-feedback-anchor-design.md`](/Users/cooper/Documents/code/MemoryCapsule/docs/superpowers/specs/2026-04-19-text-card-copy-feedback-anchor-design.md)

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `app/src/store/transientFeedbackStore.ts` | Modify | Persist optional `anchorRect` with the current transient message |
| `app/src/services/showTransientFeedback.ts` | Modify | Accept optional anchor metadata without widening the API beyond this use case |
| `app/src/components/TransientFeedbackHost.tsx` | Modify | Compute anchored placement, top-first fallback, horizontal clamp, and default bottom fallback |
| `app/src/components/__tests__/TransientFeedbackHost.test.tsx` | Modify | Lock anchored placement, fallback, clamp, and default-position behavior |
| `app/src/components/EntryCard.tsx` | Modify | Provide a measurable ref for the active card shell |
| `app/src/components/entry-card/useEntryCardController.ts` | Modify | Measure the text card after copy success and pass the anchor rectangle into transient feedback |
| `app/src/components/__tests__/EntryCard.test.tsx` | Modify | Verify anchored feedback payload and measure-failure fallback |
| `docs/superpowers/specs/2026-04-19-text-card-copy-feedback-anchor-design.md` | Modify | Mark the anchor spec as implemented and record verification evidence after code lands |

---

### Task 1: Extend transient feedback to support anchored positioning

**Files:**
- Modify: `app/src/store/transientFeedbackStore.ts`
- Modify: `app/src/services/showTransientFeedback.ts`
- Modify: `app/src/components/TransientFeedbackHost.tsx`
- Modify: `app/src/components/__tests__/TransientFeedbackHost.test.tsx`

- [x] **Step 1: Write the failing host tests for anchored positioning**

Update `app/src/components/__tests__/TransientFeedbackHost.test.tsx` by keeping the existing tests and adding these cases:

```tsx
  it('positions anchored feedback above the card when top space is available', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制', {
        anchorRect: { x: 40, y: 280, width: 180, height: 72 },
      });
    });

    const host = screen.getByTestId('transient-feedback-host');
    const style = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style)
      : host.props.style;

    expect(style.top).toBe(224);
    expect(style.bottom).toBeUndefined();
    expect(style.left).toBe(70);
  });

  it('falls below the card when the card is too close to the top edge', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制', {
        anchorRect: { x: 32, y: 18, width: 180, height: 72 },
      });
    });

    const host = screen.getByTestId('transient-feedback-host');
    const style = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style)
      : host.props.style;

    expect(style.top).toBe(102);
    expect(style.bottom).toBeUndefined();
  });

  it('clamps anchored feedback horizontally inside the viewport', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制', {
        anchorRect: { x: -12, y: 260, width: 80, height: 72 },
      });
    });

    const host = screen.getByTestId('transient-feedback-host');
    const style = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style)
      : host.props.style;

    expect(style.left).toBe(16);
  });

  it('keeps the default bottom placement when no anchor rect is provided', () => {
    const screen = render(<TransientFeedbackHost />);

    act(() => {
      showTransientFeedback('已复制');
    });

    const host = screen.getByTestId('transient-feedback-host');
    const style = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style)
      : host.props.style;

    expect(style.bottom).toBe(36);
    expect(style.top).toBeUndefined();
  });
```

Keep the safe-area mock, and add a `Dimensions` mock near the top of the file so placement math is deterministic:

```tsx
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.spyOn(require('react-native').Dimensions, 'get').mockReturnValue({
  width: 320,
  height: 640,
  scale: 2,
  fontScale: 1,
});
```

- [x] **Step 2: Run the host test file and confirm it fails**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx
```

Expected: FAIL because `showTransientFeedback` does not accept anchor data yet, and `TransientFeedbackHost` still renders only the fixed bottom placement.

- [x] **Step 3: Implement optional anchor support in the store, service, and host**

Update `app/src/store/transientFeedbackStore.ts`:

```ts
import { create } from 'zustand';

export type TransientFeedbackAnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TransientFeedbackState = {
  currentMessage: string | null;
  anchorRect: TransientFeedbackAnchorRect | null;
  sequence: number;
  show: (message: string, anchorRect?: TransientFeedbackAnchorRect | null) => void;
  dismiss: (expectedSequence?: number) => void;
};

export const useTransientFeedbackStore = create<TransientFeedbackState>((set, get) => ({
  currentMessage: null,
  anchorRect: null,
  sequence: 0,
  show: (message, anchorRect = null) =>
    set((state) => ({
      currentMessage: message,
      anchorRect,
      sequence: state.sequence + 1,
    })),
  dismiss: (expectedSequence) => {
    if (expectedSequence != null && get().sequence !== expectedSequence) {
      return;
    }

    set({
      currentMessage: null,
      anchorRect: null,
    });
  },
}));
```

Update `app/src/services/showTransientFeedback.ts`:

```ts
import {
  useTransientFeedbackStore,
  type TransientFeedbackAnchorRect,
} from '@/src/store/transientFeedbackStore';

interface ShowTransientFeedbackOptions {
  anchorRect?: TransientFeedbackAnchorRect | null;
}

export function showTransientFeedback(
  message: string,
  options?: ShowTransientFeedbackOptions,
): void {
  useTransientFeedbackStore.getState().show(message, options?.anchorRect ?? null);
}
```

Update `app/src/components/TransientFeedbackHost.tsx`:

```tsx
import React, { useEffect } from 'react';
import { AccessibilityInfo, Dimensions, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

const HIDE_DELAY_MS = 1400;
const HORIZONTAL_MARGIN = 16;
const VERTICAL_GAP = 12;
const TOAST_WIDTH = 120;
const TOAST_HEIGHT = 44;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function TransientFeedbackHost() {
  const insets = useSafeAreaInsets();
  const window = Dimensions.get('window');
  const currentMessage = useTransientFeedbackStore((state) => state.currentMessage);
  const anchorRect = useTransientFeedbackStore((state) => state.anchorRect);
  const sequence = useTransientFeedbackStore((state) => state.sequence);
  const dismiss = useTransientFeedbackStore((state) => state.dismiss);

  useEffect(() => {
    if (!currentMessage) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(currentMessage);

    const timeout = setTimeout(() => {
      dismiss(sequence);
    }, HIDE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentMessage, dismiss, sequence]);

  if (!currentMessage) {
    return null;
  }

  const anchoredLeft = anchorRect
    ? clamp(
        anchorRect.x + anchorRect.width / 2 - TOAST_WIDTH / 2,
        HORIZONTAL_MARGIN,
        window.width - HORIZONTAL_MARGIN - TOAST_WIDTH,
      )
    : undefined;

  const anchoredTop =
    anchorRect && anchorRect.y - VERTICAL_GAP - TOAST_HEIGHT >= insets.top + HORIZONTAL_MARGIN
      ? anchorRect.y - VERTICAL_GAP - TOAST_HEIGHT
      : anchorRect
        ? anchorRect.y + anchorRect.height + VERTICAL_GAP
        : undefined;

  const hostStyle = anchorRect
    ? {
        position: 'absolute' as const,
        left: anchoredLeft,
        top: anchoredTop,
        width: TOAST_WIDTH,
      }
    : {
        position: 'absolute' as const,
        left: HORIZONTAL_MARGIN,
        right: HORIZONTAL_MARGIN,
        bottom: Math.max(insets.bottom, 16) + 20,
        alignItems: 'center' as const,
      };

  return (
    <View
      className={anchorRect ? undefined : 'items-center'}
      pointerEvents="none"
      testID="transient-feedback-host"
      style={hostStyle}
    >
      <View className="rounded-[14px] bg-neutral-900/90 px-[14px] py-[10px]">
        <Text className="text-center text-sm font-semibold text-white">{currentMessage}</Text>
      </View>
    </View>
  );
}
```

- [x] **Step 4: Re-run the host tests and confirm they pass**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx
```

Expected: PASS with the existing lifetime/accessibility cases plus the new anchored-position tests.

- [x] **Step 5: Commit the anchored transient feedback changes**

Run:

```bash
git add app/src/store/transientFeedbackStore.ts app/src/services/showTransientFeedback.ts app/src/components/TransientFeedbackHost.tsx app/src/components/__tests__/TransientFeedbackHost.test.tsx
git commit -F - <<'EOF'
Anchor transient copy feedback near the triggering card

The copy success hint should feel connected to the card the user just acted on,
so the transient feedback path now accepts an optional anchor rectangle and
positions the hint above that card when space allows.

Constraint: Anchored feedback must preserve the existing no-anchor fallback
Rejected: Render per-card local overlays | duplicates layering and positioning logic across card contexts
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep the transient feedback payload limited to message plus optional anchorRect unless a future design explicitly widens it
Tested: Targeted transient feedback host test suite
Not-tested: Simulator/device visual placement
EOF
```

---

**Implementation note:** `TransientFeedbackHost` 最终通过 `onLayout` 实测提示尺寸完成锚定定位，而不是使用固定 toast 宽高；上下翻转与边界保护规则保持不变。

### Task 2: Measure the text card and send anchored feedback

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Modify: `app/src/components/entry-card/useEntryCardController.ts`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [x] **Step 1: Write the failing EntryCard tests for anchored feedback**

Update `app/src/components/__tests__/EntryCard.test.tsx` to extend the existing `expo-clipboard` / `showTransientFeedback` tests.

Inside the long-press block, add:

```tsx
  it('passes the measured card rect into transient feedback after a successful text copy', async () => {
    render(<EntryCard entry={mockEntry} onDelete={jest.fn()} />);

    const card = screen.getByTestId('entry-card');
    card.measureInWindow = jest.fn((callback) => callback(24, 180, 220, 84));

    await act(async () => {
      fireEvent(card, 'longPress');
    });

    expect(showTransientFeedback).toHaveBeenCalledWith('已复制', {
      anchorRect: { x: 24, y: 180, width: 220, height: 84 },
    });
  });

  it('falls back to message-only transient feedback when measuring the card fails', async () => {
    render(<EntryCard entry={mockEntry} onDelete={jest.fn()} />);

    const card = screen.getByTestId('entry-card');
    card.measureInWindow = jest.fn();

    await act(async () => {
      fireEvent(card, 'longPress');
    });

    expect(showTransientFeedback).toHaveBeenCalledWith('已复制');
  });
```

Keep the existing assertions for copy success, copy failure, photo/voice no-copy, and no legacy text expand hint.

- [x] **Step 2: Run the EntryCard test file and confirm it fails**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx
```

Expected: FAIL because `showTransientFeedback` is still called without anchor metadata and `EntryCard` does not expose a measurable ref path yet.

- [x] **Step 3: Implement card measurement and anchored feedback dispatch**

Update `app/src/components/entry-card/useEntryCardController.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import type { Entry } from '@/src/types/entry';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
import { logger } from '@/src/utils/logger';
import { isEntryMediaPendingHydration } from '@/src/utils/mediaAvailability';
import { useEntryCardActionSheetState } from './useEntryCardActionSheetState';

interface CardAnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseEntryCardControllerOptions {
  entry: Entry;
  onDelete: (id: string) => void | Promise<void>;
  onView?: (entry: Entry) => void;
  onEdit?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (entryId: string) => void;
  isPlayingAudio: boolean;
  onPlayAudio: () => void | Promise<void>;
  measureCardRect?: () => Promise<CardAnchorRect | null>;
}
```

Inside the text-copy branch:

```ts
  const handleLongPress = useCallback(async () => {
    if (entry.type === 'text') {
      try {
        await Clipboard.setStringAsync(entry.content);
        const anchorRect = await measureCardRect?.();
        if (anchorRect) {
          showTransientFeedback('已复制', { anchorRect });
        } else {
          showTransientFeedback('已复制');
        }
      } catch (error) {
        logger.error('Failed to copy entry content:', error);
        showErrorFeedback({
          title: '复制失败',
          message: '复制文本失败，请重试',
          actions: [{ label: '知道了', role: 'primary' }],
        });
      }
      return;
    }

    setIsExpanded(true);
  }, [entry, measureCardRect]);
```

Update `app/src/components/EntryCard.tsx`:

```tsx
import React, { useCallback, useRef } from 'react';
import type { Pressable as RNPressable } from 'react-native';
import { Pressable, Text, View } from 'react-native';
```

Inside the component body:

```tsx
  const cardRef = useRef<RNPressable | null>(null);

  const measureCardRect = useCallback(
    () =>
      new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
        const node = cardRef.current as
          | (RNPressable & {
              measureInWindow?: (
                callback: (x: number, y: number, width: number, height: number) => void,
              ) => void;
            })
          | null;

        if (!node?.measureInWindow) {
          resolve(null);
          return;
        }

        node.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      }),
    [],
  );
```

Pass it into the controller:

```tsx
    measureCardRect,
```

Attach the ref to the card pressable:

```tsx
            <Pressable
              ref={cardRef}
              testID="entry-card"
```

- [x] **Step 4: Re-run the EntryCard tests and confirm they pass**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS, including the new anchor-payload and measure-failure fallback cases.

- [x] **Step 5: Commit the card-anchored feedback dispatch**

Run:

```bash
git add app/src/components/EntryCard.tsx app/src/components/entry-card/useEntryCardController.ts app/src/components/__tests__/EntryCard.test.tsx
git commit -F - <<'EOF'
Measure text cards before showing anchored copy feedback

The anchored feedback host only knows how to position the hint once it has the
triggering card rectangle, so the text-card copy path now measures the card
after a successful copy and forwards that anchor data with the transient
feedback call.

Constraint: Copy success must still fall back to the default transient placement if card measurement is unavailable
Rejected: Treat missing measurement as a hard failure | would hide success feedback even though the copy already completed
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep measurement local to the text-card copy path; do not start measuring cards for unrelated interactions
Tested: Targeted EntryCard test suite
Not-tested: Simulator/device placement around animated list updates
EOF
```

---

**Implementation note:** 文本卡片锚点最终在 `useEntryCardController.ts` 内基于长按事件目标和 `UIManager.measureInWindow` 直接测量，未在 `EntryCard.tsx` 挂载卡片 `ref`；测量失败时仍按计划回退到默认提示位置。

### Task 3: Run verification and close the docs loop

**Files:**
- Modify: `docs/superpowers/specs/2026-04-19-text-card-copy-feedback-anchor-design.md`
- Modify: `docs/superpowers/plans/2026-04-19-text-card-copy-feedback-anchor.md`

- [x] **Step 1: Run the full verification commands for the anchored-feedback change**

Run:

```bash
cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx src/components/__tests__/EntryCard.test.tsx
cd app && rtk pnpm run lint
cd app && rtk pnpm run typecheck
```

Expected:

- Both targeted test files PASS
- `pnpm run lint` exits `0`
- `pnpm run typecheck` exits `0`

- [x] **Step 2: Update the anchor spec to reflect implementation completion**

Change the header in `docs/superpowers/specs/2026-04-19-text-card-copy-feedback-anchor-design.md`:

```md
**状态：** 已实现
```

Append a verification line under the review record:

```md
- 2026-04-19：实现完成，已运行 `cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx src/components/__tests__/EntryCard.test.tsx`、`cd app && rtk pnpm run lint`、`cd app && rtk pnpm run typecheck`，结果均通过
```

- [x] **Step 3: Mark completed checkboxes in this plan and record any real deviation**

At the end of execution, check off every completed step in this file. If implementation differed from the plan, add one short note below the relevant task, for example:

```md
**Implementation note:** `TransientFeedbackHost` used a slightly different internal constant naming scheme, but the anchored placement rules stayed the same.
```

Only add this note if it is true.

- [x] **Step 4: Commit the verification evidence and docs closure**

Run:

```bash
git add docs/superpowers/specs/2026-04-19-text-card-copy-feedback-anchor-design.md docs/superpowers/plans/2026-04-19-text-card-copy-feedback-anchor.md
git commit -F - <<'EOF'
Record completion evidence for anchored copy feedback

The anchored feedback follow-up is only complete once the spec and plan match
the implemented state and point to the real verification evidence. This commit
closes that workflow loop.

Constraint: Process requires the spec, plan, and verification record to stay aligned
Rejected: Leave the anchor spec in approved state after implementation | would make the workflow ambiguous to future modifiers
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Do not mark anchored-feedback docs complete without rerunning the targeted host and EntryCard verification
Tested: Targeted anchored-feedback tests, lint, typecheck
Not-tested: Manual simulator/device visual verification
EOF
```
