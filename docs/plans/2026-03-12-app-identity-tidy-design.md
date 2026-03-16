# App Identity Tidy Design

**Date:** 2026-03-12

**Scope**

Apply the smallest safe naming cleanup for the app project:
- change the Expo deep-link scheme from `app` to `memorycapsule`;
- change the Node package name from `app` to `memorycapsule-app`;
- keep the shipping bundle/package identifier `com.memorycapsule.app` unchanged.

**Why This Scope**

The current app name and bundle identifiers are valid. The generic deep-link scheme and generic package manager name are the weak points. Tightening only those two values improves uniqueness and maintainability without risking store identity changes.
