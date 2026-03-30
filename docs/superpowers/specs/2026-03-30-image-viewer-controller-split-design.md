# 2026-03-30 Image Viewer Controller Split Design

## Summary

Perform a minimal structural refactor of `app/src/components/image-viewer/useImageViewerController.ts` by extracting the close/shared-transition lifecycle into a focused local hook, while keeping `useImageViewerController()` as the outward-facing controller used by `ImageViewer`.

This is intentionally the first and smallest split for the image-viewer controller. Gesture wiring, transform state, and action-sheet state remain in the existing controller for now.

## Goals

- Reduce the number of unrelated responsibilities inside `useImageViewerController.ts`.
- Isolate the most nested and lifecycle-heavy portion of the controller: close handling and shared-element return transition.
- Preserve the existing `useImageViewerController()` public return shape consumed by `ImageViewer`.
- Keep all current image-viewer behavior, transition timing, and dismissal semantics unchanged.

## Non-Goals

- Refactor gesture composition in this change set.
- Refactor action-sheet state and save/share callbacks in this change set.
- Change `ImageViewer` render structure or visual behavior.
- Redesign the shared-element UX.

## Current State

`useImageViewerController.ts` currently mixes several distinct concerns:

- modal open/close lifecycle state (`phase`)
- image transform state (`scale`, `translateX/Y`, dismiss state)
- gesture integration through `useImageViewerGestures`
- shared-element close transition and hero animation state
- action-sheet visibility and action handlers

The clearest extraction boundary is the close/shared-transition subsystem, which currently owns:

- `phase`
- `isMountedRef`
- `canAnimateBackRef`
- `shouldIgnoreSharedTransitionRef`
- `prevDimensions`
- `heroLeft`, `heroTop`, `heroWidth`, `heroHeight`
- `backdropOpacity` close path
- `performClose()`
- `startFadeClose()`
- `triggerClose()`
- `triggerCloseAnimation()`
- the `phase === 'closing'` effect
- the screen-dimension change fallback-close effect

This is the most lifecycle-heavy and branching-heavy logic in the file, and it already behaves like a dedicated internal state machine.

## Chosen Approach

Keep `useImageViewerController()` as the public facade, but extract the close/shared-transition logic into a nearby local hook, for example:

- `useImageViewerCloseTransition`

This hook will own the close state machine and return the minimal state/handlers the outer controller needs.

This is preferred over extracting action-sheet state first because:

- action-sheet logic is already fairly small and partially delegated to `useImageViewerActions`
- the close/shared-transition path is the most complex part of the current controller
- existing lifecycle and shared-element tests already provide strong external coverage for this boundary

## Detailed Design

### 1. New local hook for close/shared-transition lifecycle

Create a new file in the same folder:

- `app/src/components/image-viewer/useImageViewerCloseTransition.ts`

This hook should encapsulate only the close lifecycle and shared-element return behavior.

It should own:

- `phase`
- hero shared values (`heroLeft`, `heroTop`, `heroWidth`, `heroHeight`)
- `backdropOpacity` close-path ownership
- refs governing close behavior:
  - `isMountedRef`
  - `canAnimateBackRef`
  - `shouldIgnoreSharedTransitionRef`
  - `prevDimensions`
- `performClose()`
- `startFadeClose()`
- `triggerClose()`
- `triggerCloseAnimation()`
- related close and dimension-change effects

It should accept only the minimal dependencies it needs, such as:

- `visible`
- `onClose`
- `originLayout`
- `thumbnailRef`
- `screenWidth`
- `screenHeight`
- the shared values that must still be reset when opening/closing
- `cancelAllAnimations()`

It should not own:

- `showActionSheet`
- `closeActionSheet()`
- `useImageViewerActions()`
- `useImageViewerGestures()`
- `imageAnimatedStyle`

### 2. Keep `useImageViewerController()` as orchestrator

After extraction, `useImageViewerController()` should continue to own and expose:

- `showActionSheet`
- `closeActionSheet`
- transform shared values used by gestures and image animation
- `composedGesture`
- `imageAnimatedStyle`
- `handleSaveToAlbum`
- `handleShare`

It should compose the new close-transition hook and keep returning the same public shape currently consumed by `ImageViewer`, including:

- `phase`
- `backdropAnimatedStyle`
- `heroAnimatedStyle`
- `handleRequestClose`

### 3. Preserve timing and close semantics exactly

The following behavior must remain unchanged:

- when shared-element back animation is unavailable, close falls back to fade-out
- when the thumbnail is off-screen, close falls back to fade-out
- when screen dimensions change during opening/closing, the controller abandons the shared transition and fades out
- `onClose()` is only invoked through the same existing close paths
- `visible={false}` still returns the controller to `idle`

This refactor is structural only.

### 4. File structure

Expected files after refactor:

- `app/src/components/image-viewer/useImageViewerController.ts`
- `app/src/components/image-viewer/useImageViewerCloseTransition.ts`

The new hook should stay local to the image-viewer folder and should not be generalized prematurely.

## Testing Strategy

Prefer existing `ImageViewer` integration tests, because the public controller contract should remain stable.

Most relevant verification targets:

- `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
- `app/src/components/__tests__/ImageViewer.shared-element.test.tsx`
- `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`
- `npm run test:frontend:editor-image`
- `npm run verify`

If an extra regression test is needed, it should focus on externally visible close behavior, not on whether the new internal hook exists.

## Risks And Mitigations

### Risk: extraction changes close timing or fallback behavior

Mitigation:

- move the close/shared-transition logic mechanically first
- preserve the same durations and branch order
- validate with lifecycle and shared-element tests

### Risk: new hook accidentally absorbs gesture or action-sheet responsibilities

Mitigation:

- limit the new hook strictly to close/shared-transition lifecycle
- keep gesture composition and action-sheet state in the outer controller

### Risk: tests drift toward implementation-detail assertions

Mitigation:

- reuse existing ImageViewer integration tests as primary guardrails
- avoid adding tests that assert delegation to the new hook by name

## Implementation Boundaries

The implementation should remain minimal:

- Only extract close/shared-transition lifecycle logic.
- Do not refactor gesture composition or action-sheet state in this work item.
- Do not change `ImageViewer` UI behavior.
- Do not redesign the shared-element experience.

## Success Criteria

- `useImageViewerController.ts` is meaningfully smaller and easier to scan.
- close/shared-transition logic lives in `useImageViewerCloseTransition.ts`.
- `useImageViewerController()` keeps the same public return shape for `ImageViewer`.
- relevant image-viewer tests and project verification pass.
