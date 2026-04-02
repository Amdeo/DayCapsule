# Gitea Android APK Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Gitea Actions workflow that builds and uploads an unsigned Android release APK on the existing Ubuntu runner.

**Architecture:** Keep the workflow manual and Android-only. Use standard setup actions for Node and Java, install Android SDK components on the runner, generate the native Android project with Expo prebuild, then build `assembleRelease` and upload the unsigned APK artifact.

**Tech Stack:** Gitea Actions, Expo SDK 54, React Native 0.81, Gradle, Android SDK

---

### Task 1: Add Android APK Workflow

**Files:**
- Create: `.gitea/workflows/android-release.yml`
- Modify: `docs/DEPLOYMENT.md`

**Step 1: Create the workflow**

Add a manual `workflow_dispatch` job that:
- checks out the repo;
- sets up Node 20 and Java 17;
- installs Android SDK command-line tooling and required packages;
- runs `pnpm install --frozen-lockfile`, `pnpm run typecheck`, and `pnpm test --runInBand` in `app/`;
- runs `pnpm exec expo prebuild --platform android --non-interactive --clean`;
- runs `./gradlew assembleRelease`;
- uploads `app-release-unsigned.apk` as an artifact.

**Step 2: Document the workflow**

Add a short deployment note covering:
- current runner limitation to Android/Linux;
- expected APK artifact path;
- reminder that this APK is unsigned and only for CI verification.

**Step 3: Verify**

Run:
- `ruby -e "require 'yaml'; YAML.load_file('.gitea/workflows/android-release.yml'); puts 'yaml ok'"`
- `pnpm run typecheck` in `app/`
- `pnpm test --runInBand` in `app/`

Expected:
- workflow YAML parses;
- typecheck passes;
- tests pass.
