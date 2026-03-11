# Gitea Android APK Design

**Date:** 2026-03-12

**Scope**

Add a Gitea Actions workflow that runs on the existing Ubuntu Docker runner and produces an unsigned Android release APK for pipeline verification.

**Chosen Approach**

Use `Expo prebuild + Gradle assembleRelease` directly inside Gitea Actions.

**Why**

This matches the user's requirement for a local build artifact and fits the current runner fleet, which only has Linux labels. It avoids depending on Expo cloud build and keeps the workflow transparent.

**Constraints**

- Output is an unsigned APK for verification, not a distributable store artifact.
- The current runner fleet cannot build iOS because there is no macOS/Xcode runner.
- The repo does not commit `android/`, so the workflow must generate it during the run.

**Success Criteria**

- Manual Gitea workflow can run on `ubuntu-latest`.
- It executes `typecheck`, tests, prebuild, and Gradle release build.
- It uploads the generated unsigned APK as an artifact.
