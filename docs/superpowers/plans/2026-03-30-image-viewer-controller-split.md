# Image Viewer Controller Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the close/shared-transition lifecycle out of `useImageViewerController.ts` while keeping `ImageViewer` behavior and the controller’s public return shape unchanged.

**Architecture:** Keep `useImageViewerController()` as the public composition hook and move only the close/shared-transition subsystem into a new local hook, `useImageViewerCloseTransition`. Gesture wiring, transform state, action-sheet visibility, and save/share action handling stay in the existing controller for this change set.

**Tech Stack:** TypeScript, React, React Native Reanimated, Jest, Testing Library, React Test Renderer

---

### Task 1: Extract `useImageViewerCloseTransition`

**Files:**
- Create: `app/src/components/image-viewer/useImageViewerCloseTransition.ts`
- Modify: `app/src/components/image-viewer/useImageViewerController.ts`
- Test: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
- Test: `app/src/components/__tests__/ImageViewer.shared-element.test.tsx`

- [ ] **Step 1: Write the failing test**

Add one focused regression assertion to `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx` that proves a close request still falls back cleanly when the thumbnail ref is absent.

Append this test if no equivalent assertion already exists:

```ts
it('falls back to fade close when shared-element return is unavailable', async () => {
  const onClose = jest.fn();
  let tree: renderer.ReactTestRenderer;

  await act(async () => {
    tree = renderer.create(
      <ImageViewer
        visible
        imageUri='file:///image-a.jpg'
        onClose={onClose}
      />
    );
  });

  await act(async () => {
    const modal = tree.root.findByType(Modal);
    modal.props.onRequestClose();
  });

  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails or meaningfully locks current behavior**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx -t "falls back to fade close when shared-element return is unavailable"
```

Expected:

- Either FAIL because the assertion is new and stricter than current coverage
- Or PASS immediately, which means it now locks the desired behavior before extraction

- [ ] **Step 3: Write the minimal implementation**

Create `app/src/components/image-viewer/useImageViewerCloseTransition.ts` and move only the close/shared-transition lifecycle logic out of `useImageViewerController.ts`.

Target shape:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ImageViewerPhase, ImageViewerProps } from './imageViewerTypes';

interface UseImageViewerCloseTransitionOptions {
  visible: boolean;
  onClose: () => void;
  originLayout?: ImageViewerProps['originLayout'];
  thumbnailRef?: ImageViewerProps['thumbnailRef'];
  screenWidth: number;
  screenHeight: number;
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedTranslateX: SharedValue<number>;
  savedTranslateY: SharedValue<number>;
  dismissY: SharedValue<number>;
  dismissScale: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  panMode: SharedValue<0 | 1>;
}
```

The new hook should own:

- `phase`
- hero shared values
- `performClose`
- `startFadeClose`
- `triggerClose`
- `triggerCloseAnimation`
- close/dimension-change effects
- `cancelAllAnimations`

Then update `useImageViewerController.ts` to consume the new hook and keep exposing the same public members currently used by `ImageViewer.tsx`.

Do not move `showActionSheet`, `closeActionSheet`, `useImageViewerActions`, or `useImageViewerGestures`.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx
```

Then run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/image-viewer/useImageViewerCloseTransition.ts src/components/image-viewer/useImageViewerController.ts src/components/__tests__/image/image-viewer.lifecycle.test.tsx
git commit -m "refactor: extract image viewer close transition"
```

### Task 2: Final Verification

**Files:**
- Verify only: `app/src/components/image-viewer/useImageViewerController.ts`
- Verify only: `app/src/components/image-viewer/useImageViewerCloseTransition.ts`
- Verify only: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
- Verify only: `app/src/components/__tests__/ImageViewer.shared-element.test.tsx`
- Verify only: `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`

- [ ] **Step 1: Run focused image-viewer tests**

Run:

```bash
pnpm test --runInBand --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full editor/image frontend suite**

Run:

```bash
pnpm run test:frontend:editor-image
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
pnpm run verify
```

Expected: PASS.

- [ ] **Step 4: Review final scoped diff**

Run:

```bash
git diff -- src/components/image-viewer/useImageViewerController.ts src/components/image-viewer/useImageViewerCloseTransition.ts src/components/__tests__/image/image-viewer.lifecycle.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx
```

Expected: diff contains only the approved close/shared-transition extraction and any minimal regression-test additions.

- [ ] **Step 5: Commit**

```bash
git add src/components/image-viewer/useImageViewerController.ts src/components/image-viewer/useImageViewerCloseTransition.ts src/components/__tests__/image/image-viewer.lifecycle.test.tsx
git commit -m "refactor: split image viewer controller" || true
```

If there is nothing left to commit because Task 1 already captured the final code state, record that explicitly in execution notes and do not force an empty commit.
