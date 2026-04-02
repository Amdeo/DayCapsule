# Release Hardening Design

**Date:** 2026-03-11

**Scope**

This pass only fixes repository-contained launch blockers. It does not change the app identity, create real store credentials, or perform cloud submission.

**Chosen Approach**

Use a minimal release-hardening batch:
- realign the Jest toolchain with Expo so the existing suite can run;
- fix the async backup timestamp bug so backup gating and backup history are correct;
- move release config closer to store-ready defaults without adding secrets;
- update docs to match the actual repository state.

**Why This Approach**

It removes the highest-risk false signals first. Right now the repo claims tests and release readiness that are not true in the current workspace. Restoring trustworthy tests and correct backup behavior gives a usable baseline before any store-specific work.

**Design**

1. **Test baseline**
   Align Jest with `jest-expo` and update stale `SyncService` tests to the current API contract.

2. **Backup behavior**
   Make backup timestamp reads asynchronous end-to-end so `shouldBackup()` and "last backup time" use actual MMKV values instead of `Promise` objects.

3. **Release config**
   Keep placeholders for credentials out of code, switch Android production builds to store-oriented output, and make the docs explicit about what remains manual.

4. **Documentation**
   Reconcile README and deployment docs with the actual scripts, file layout, and verification results.

**Success Criteria**

- `pnpm test --runInBand` passes.
- Backup timestamp logic is correct under async MMKV access.
- Release docs no longer claim unsupported or unverified states.
