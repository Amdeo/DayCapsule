# App Identity Tidy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the project naming more production-appropriate without changing the released app identifiers.

**Architecture:** Keep bundle/package identifiers stable and only update the generic config fields that are safe to rename locally. Verify with Expo config output and a clean test/typecheck pass.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, iOS Info.plist

---

### Task 1: Tighten Config Names

**Files:**
- Modify: `app/app.json`
- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Modify: `app/ios/MemoryCapsule/Info.plist`

**Step 1: Update the Expo scheme**

Change the app deep-link scheme from `app` to `memorycapsule`.

**Step 2: Update the Node package name**

Change the project package name from `app` to `memorycapsule-app` in both `package.json` and `package-lock.json`.

**Step 3: Keep native iOS URL schemes aligned**

Update the committed `Info.plist` URL scheme entry so the checked-in native project matches Expo config.

**Step 4: Verify**

Run:
- `npx expo config --type public`
- `npm run typecheck`
- `npm test -- --runInBand`

Expected:
- Expo config shows `scheme: "memorycapsule"`
- typecheck passes
- tests pass
