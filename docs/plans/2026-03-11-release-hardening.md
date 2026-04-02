# Release Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore a trustworthy release baseline for MemoryCapsule by fixing the test toolchain, backup timestamp logic, and release documentation/config.

**Architecture:** Keep behavior changes small and local. First make the test runner truthful, then use tests to drive the async backup fix, and finally reconcile release configuration and docs with what is actually shippable from the repo.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Jest, jest-expo, MMKV, EAS Build

---

### Task 1: Fix Jest Baseline

**Files:**
- Modify: `app/package.json`
- Modify: `app/pnpm-lock.yaml`
- Test: `app/src/services/__tests__/syncService.test.ts`

**Step 1: Use the existing failing test run as RED**

Run: `pnpm test --runInBand`
Expected: `SyncService` tests fail while the suite starts successfully.

**Step 2: Realign Jest with Expo**

Install matching Jest 29 dev dependencies for `jest-expo`.

**Step 3: Update stale `SyncService` tests**

Match the current `pickAndParseBackup()` return shape and test media extraction via `extractMediaFromZip()`.

**Step 4: Re-run tests**

Run: `pnpm test --runInBand`
Expected: all current suites pass or only fail on the next intentional RED change.

### Task 2: Fix Async Backup Timestamp Logic

**Files:**
- Modify: `app/src/services/__tests__/backupService.test.ts`
- Modify: `app/src/services/backupService.ts`
- Modify: `app/src/components/BackupPage.tsx`
- Modify: `app/app/_layout.tsx`

**Step 1: Write the failing test**

Change `BackupService` tests so `Storage.getString()` is treated as async and `shouldBackup()` / `getLastBackupTime()` are awaited.

**Step 2: Run targeted test to verify RED**

Run: `pnpm test --runInBand src/services/__tests__/backupService.test.ts`
Expected: failures caused by sync backup methods using async storage incorrectly.

**Step 3: Implement minimal async fix**

Make backup timestamp methods async and update callers.

**Step 4: Re-run targeted and full tests**

Run:
- `pnpm test --runInBand src/services/__tests__/backupService.test.ts`
- `pnpm test --runInBand`

Expected: both pass.

### Task 3: Tighten Release Config And Docs

**Files:**
- Modify: `app/eas.json`
- Modify: `README.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/PRODUCTION_READINESS.md`

**Step 1: Make config less misleading**

Use store-oriented Android production output and remove claims that credentials are already complete.

**Step 2: Reconcile docs with reality**

Update scripts, verification notes, and outstanding manual launch items.

**Step 3: Final verification**

Run:
- `npx tsc --noEmit`
- `pnpm test --runInBand`

Expected: both pass.
