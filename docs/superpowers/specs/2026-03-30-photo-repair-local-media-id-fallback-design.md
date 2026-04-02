# 2026-03-30 Photo Repair Local Media ID Fallback Design

## Summary

Fix `app/src/services/photoRepairService.ts` so photo repair still carries a stable `localMediaId` in upload metadata and repair logs when the incoming `MediaRepairIssue` omits `localMediaId`, by falling back to the existing target media item's stored `metadata.localMediaId`.

This change is intentionally narrow. It does not redesign the repair flow or change how repaired media is written back to entries.

## Goals

- Preserve `localMediaId` in repair upload metadata when the issue payload does not provide it.
- Preserve `localMediaId` in repair confirmation, completion, and failure logs when a fallback is available.
- Keep all existing photo repair behavior unchanged otherwise.
- Add focused tests for both success and failure paths using the fallback.

## Non-Goals

- Redesign `MediaRepairIssue` shape.
- Change how repaired media arrays are built or persisted.
- Refactor `photoRepairService` beyond this fallback behavior.
- Touch unrelated sync/bootstrap logic.

## Current State

`photoRepairService.ts` currently uses `issue.localMediaId` directly for:

- upload metadata (`traceId`, `localMediaId`)
- repair confirmation logs
- repair completion logs
- repair failure logs

If `issue.localMediaId` is missing, the current implementation proceeds, but those metadata/log fields remain `undefined` even when the target entry already contains a usable `metadata.localMediaId` on the repaired media item.

The service already loads the target entry before upload to validate the repair target, so the missing identifier can be recovered from the existing media record without changing the broader flow.

## Chosen Approach

Introduce a small local fallback value, `repairLocalMediaId`, derived in this order:

1. `issue.localMediaId`
2. `entry.media[issue.mediaIndex]?.metadata?.localMediaId`

Then use that fallback value only for:

- upload metadata
- repair logs

Do not change the core repair flow, media replacement logic, or sync triggering.

This is preferred because it preserves traceability with minimal surface-area change and without requiring a broader `MediaRepairIssue` contract rewrite.

## Detailed Design

### 1. Resolve a fallback local media ID

Inside `repair(issue)`, after loading the repair target entry, derive:

```ts
const repairLocalMediaId = issue.localMediaId ?? entry.media[issue.mediaIndex]?.metadata?.localMediaId;
```

This value is best-effort. If neither source provides an ID, the service may still proceed as it does today.

### 2. Use fallback in upload metadata

Update `buildRepairUploadMetadata()` so it receives the resolved fallback ID and uses it for:

- `traceId`
- `localMediaId`

No other metadata fields should change.

### 3. Use fallback in logs

Update `buildRepairLogPayload()` so it accepts an optional local-media override and prefers that override over `issue.localMediaId`.

This preserves the same log event names and payload structure, but fills the missing identifier when it can be recovered from the target entry.

### 4. Keep the rest of repair flow unchanged

Do not alter:

- hash verification logic
- target-entry validation logic
- repaired media writeback behavior
- sync triggering
- error propagation semantics

This refactor is a traceability fix, not a flow redesign.

## Testing Strategy

Use the existing `photoRepairService.test.ts` file and add focused cases for:

1. fallback ID used in upload metadata and success logs when `issue.localMediaId` is missing
2. fallback ID used in failure logs when upload or sync fails and `issue.localMediaId` is missing

The tests should keep the rest of the repair setup minimal and should not expand into unrelated repair scenarios.

Relevant verification targets:

- `app/src/services/__tests__/photoRepairService.test.ts`
- `pnpm run verify`

## Risks And Mitigations

### Risk: fallback reads stale or mismatched media metadata

Mitigation:

- use only the exact target media item at `issue.mediaIndex`
- do not search or infer across other media items

### Risk: extra entry lookup changes repair flow timing

Mitigation:

- reuse the existing target-entry load already required by the service
- do not add a second redundant fetch when the entry has already been loaded

### Risk: logging and upload metadata diverge

Mitigation:

- derive a single `repairLocalMediaId` value once and thread it through both metadata and logging helpers

## Implementation Boundaries

The implementation should remain minimal:

- Only change `photoRepairService.ts` and its unit test file.
- Do not change unrelated sync services.
- Do not change `MediaRepairIssue` type definitions.

## Success Criteria

- Repair upload metadata includes a recovered `localMediaId` when the issue omits it and the target media metadata contains one.
- Repair logs include the same recovered `localMediaId` on success and failure paths.
- Existing repair behavior remains unchanged otherwise.
- Focused unit tests and project verification pass.
