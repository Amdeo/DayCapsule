# CI Gradle 并行优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 Gitea Actions 编译 release APK 的速度，通过开启 Gradle 并行、上调内存、精简日志、修正 C++ 缓存键，预期提速 40–60%。

**Architecture:** 仅修改两个 CI workflow 文件，不涉及应用源码。改动分三个独立方向：Gradle 并行配置、构建命令日志级别、C++ native 缓存键。两个文件（`.gitea` 和 `.github`）内容保持一致同步修改。

**Tech Stack:** Gitea Actions / GitHub Actions YAML、Gradle、bash sed

---

## 文件变更清单

| 操作 | 文件 | 涉及行 |
|------|------|--------|
| 修改 | `.gitea/workflows/android-release.yml` | 23, 107–109, 307–313, 356 |
| 修改 | `.github/workflows/android-release.yml` | 23, 99–101, 129–135, 172 |

---

### Task 1：移除 job 级别 `GRADLE_OPTS`（两个文件）

**Files:**
- Modify: `.gitea/workflows/android-release.yml:23`
- Modify: `.github/workflows/android-release.yml:23`

- [ ] **Step 1：修改 `.gitea/workflows/android-release.yml`**

删除第 23 行的 `GRADLE_OPTS: -Dorg.gradle.daemon=false`，该配置与后续 `--no-daemon` 标志重复，且会干扰并行配置。

将：
```yaml
    env:
      CI: "1"
      EXPO_NO_TELEMETRY: "1"
      ANDROID_PLATFORM: "36"
      BUILD_TOOLS_VERSION: "36.0.0"
      NDK_VERSION: "27.1.12297006"
      CMAKE_VERSION: "3.22.1"
      GRADLE_OPTS: -Dorg.gradle.daemon=false
      SENTRY_DISABLE_AUTO_UPLOAD: "true"
```

改为：
```yaml
    env:
      CI: "1"
      EXPO_NO_TELEMETRY: "1"
      ANDROID_PLATFORM: "36"
      BUILD_TOOLS_VERSION: "36.0.0"
      NDK_VERSION: "27.1.12297006"
      CMAKE_VERSION: "3.22.1"
      SENTRY_DISABLE_AUTO_UPLOAD: "true"
```

- [ ] **Step 2：对 `.github/workflows/android-release.yml` 做相同修改**

将：
```yaml
    env:
      CI: "1"
      EXPO_NO_TELEMETRY: "1"
      ANDROID_PLATFORM: "36"
      BUILD_TOOLS_VERSION: "36.0.0"
      NDK_VERSION: "27.1.12297006"
      CMAKE_VERSION: "3.22.1"
      GRADLE_OPTS: -Dorg.gradle.daemon=false
      SENTRY_DISABLE_AUTO_UPLOAD: "true"
```

改为：
```yaml
    env:
      CI: "1"
      EXPO_NO_TELEMETRY: "1"
      ANDROID_PLATFORM: "36"
      BUILD_TOOLS_VERSION: "36.0.0"
      NDK_VERSION: "27.1.12297006"
      CMAKE_VERSION: "3.22.1"
      SENTRY_DISABLE_AUTO_UPLOAD: "true"
```

- [ ] **Step 3：提交**

```bash
git add .gitea/workflows/android-release.yml .github/workflows/android-release.yml
git commit -m "ci: remove redundant GRADLE_OPTS daemon flag"
```

---

### Task 2：开启 Gradle 并行 + 上调内存（两个文件）

**Files:**
- Modify: `.gitea/workflows/android-release.yml:307–313`（`调整 Gradle 以适配 CI` step）
- Modify: `.github/workflows/android-release.yml:129–135`（`Tune Gradle for CI` step）

- [ ] **Step 1：修改 `.gitea/workflows/android-release.yml` 的 `调整 Gradle 以适配 CI` step**

将以下三个 sed 命令：
```bash
          sed -i 's/^org\.gradle\.jvmargs=.*/org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8/' gradle.properties
          sed -i 's/^org\.gradle\.parallel=.*/org.gradle.parallel=false/' gradle.properties
          if grep -q '^org\.gradle\.workers\.max=' gradle.properties; then
            sed -i 's/^org\.gradle\.workers\.max=.*/org.gradle.workers.max=1/' gradle.properties
          else
            echo 'org.gradle.workers.max=1' >> gradle.properties
          fi
```

替换为：
```bash
          sed -i 's/^org\.gradle\.jvmargs=.*/org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8/' gradle.properties
          sed -i 's/^org\.gradle\.parallel=.*/org.gradle.parallel=true/' gradle.properties
          WORKERS=$(( $(nproc) > 2 ? $(nproc) - 2 : 1 ))
          if grep -q '^org\.gradle\.workers\.max=' gradle.properties; then
            sed -i "s/^org\\.gradle\\.workers\\.max=.*/org.gradle.workers.max=$WORKERS/" gradle.properties
          else
            echo "org.gradle.workers.max=$WORKERS" >> gradle.properties
          fi
```

- [ ] **Step 2：对 `.github/workflows/android-release.yml` 的 `Tune Gradle for CI` step 做相同修改**

将：
```bash
          sed -i 's/^org\.gradle\.jvmargs=.*/org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8/' gradle.properties
          sed -i 's/^org\.gradle\.parallel=.*/org.gradle.parallel=false/' gradle.properties
          if grep -q '^org\.gradle\.workers\.max=' gradle.properties; then
            sed -i 's/^org\.gradle\.workers\.max=.*/org.gradle.workers.max=1/' gradle.properties
          else
            echo 'org.gradle.workers.max=1' >> gradle.properties
          fi
```

替换为：
```bash
          sed -i 's/^org\.gradle\.jvmargs=.*/org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8/' gradle.properties
          sed -i 's/^org\.gradle\.parallel=.*/org.gradle.parallel=true/' gradle.properties
          WORKERS=$(( $(nproc) > 2 ? $(nproc) - 2 : 1 ))
          if grep -q '^org\.gradle\.workers\.max=' gradle.properties; then
            sed -i "s/^org\\.gradle\\.workers\\.max=.*/org.gradle.workers.max=$WORKERS/" gradle.properties
          else
            echo "org.gradle.workers.max=$WORKERS" >> gradle.properties
          fi
```

- [ ] **Step 3：提交**

```bash
git add .gitea/workflows/android-release.yml .github/workflows/android-release.yml
git commit -m "ci: enable Gradle parallel build and increase JVM heap"
```

---

### Task 3：构建命令去掉 `--info` 日志（两个文件）

**Files:**
- Modify: `.gitea/workflows/android-release.yml:356`（`构建未签名的 Release APK` step）
- Modify: `.github/workflows/android-release.yml:172`（`Build unsigned release APK` step）

- [ ] **Step 1：修改 `.gitea/workflows/android-release.yml`**

将：
```bash
          ./gradlew --no-daemon --stacktrace --info assembleRelease 2>&1 | tee "$build_log"
```

改为：
```bash
          ./gradlew --no-daemon --stacktrace --warn assembleRelease 2>&1 | tee "$build_log"
```

- [ ] **Step 2：修改 `.github/workflows/android-release.yml`**

将：
```bash
          ./gradlew --no-daemon --stacktrace --info assembleRelease 2>&1 | tee "$build_log"
```

改为：
```bash
          ./gradlew --no-daemon --stacktrace --warn assembleRelease 2>&1 | tee "$build_log"
```

- [ ] **Step 3：提交**

```bash
git add .gitea/workflows/android-release.yml .github/workflows/android-release.yml
git commit -m "ci: reduce Gradle log level from --info to --warn"
```

---

### Task 4：修正 C++ native 缓存键（两个文件）

**Files:**
- Modify: `.gitea/workflows/android-release.yml:107–109`（`缓存原生 C++ 构建产物（.cxx）` step）
- Modify: `.github/workflows/android-release.yml:99–101`（`Cache native C++ build (.cxx)` step）

**说明：** 当前缓存键包含 `pnpm-lock.yaml`，导致任何 JS 依赖变动都会使 C++ 缓存失效。应改为只依赖 NDK 版本和原生 Android 配置文件。

- [ ] **Step 1：修改 `.gitea/workflows/android-release.yml` 的 C++ 缓存 step**

将：
```yaml
      - name: 缓存原生 C++ 构建产物（.cxx）
        uses: actions/cache@v3
        with:
          path: app/android/app/.cxx
          key: native-cxx-${{ runner.os }}-${{ steps.arch.outputs.arch }}-ndk${{ env.NDK_VERSION }}-${{ hashFiles('app/pnpm-lock.yaml') }}
          restore-keys: |
            native-cxx-${{ runner.os }}-${{ steps.arch.outputs.arch }}-ndk${{ env.NDK_VERSION }}-
```

改为：
```yaml
      - name: 缓存原生 C++ 构建产物（.cxx）
        uses: actions/cache@v3
        with:
          path: app/android/app/.cxx
          key: native-cxx-${{ runner.os }}-${{ steps.arch.outputs.arch }}-ndk${{ env.NDK_VERSION }}-${{ hashFiles('app/android/app/build.gradle', 'app/package.json') }}
          restore-keys: |
            native-cxx-${{ runner.os }}-${{ steps.arch.outputs.arch }}-ndk${{ env.NDK_VERSION }}-
```

- [ ] **Step 2：修改 `.github/workflows/android-release.yml` 的 C++ 缓存 step**

将：
```yaml
      - name: Cache native C++ build (.cxx)
        uses: actions/cache@v4
        with:
          path: app/android/app/.cxx
          key: native-cxx-${{ runner.os }}-x86_64-ndk${{ env.NDK_VERSION }}-${{ hashFiles('app/pnpm-lock.yaml') }}
          restore-keys: |
            native-cxx-${{ runner.os }}-x86_64-ndk${{ env.NDK_VERSION }}-
```

改为：
```yaml
      - name: Cache native C++ build (.cxx)
        uses: actions/cache@v4
        with:
          path: app/android/app/.cxx
          key: native-cxx-${{ runner.os }}-x86_64-ndk${{ env.NDK_VERSION }}-${{ hashFiles('app/android/app/build.gradle', 'app/package.json') }}
          restore-keys: |
            native-cxx-${{ runner.os }}-x86_64-ndk${{ env.NDK_VERSION }}-
```

- [ ] **Step 3：提交**

```bash
git add .gitea/workflows/android-release.yml .github/workflows/android-release.yml
git commit -m "ci: fix C++ cache key to not depend on JS lockfile"
```

---

## 验证

所有 task 完成后，在 Gitea 手动触发一次 workflow，对比：

1. 查看 `Tune Gradle for CI` / `调整 Gradle 以适配 CI` step 输出的 `gradle.properties`，确认：
   - `org.gradle.parallel=true`
   - `org.gradle.workers.max=<nproc-2>`
   - `org.gradle.jvmargs=-Xmx4096m`

2. 查看 `构建未签名的 Release APK` step，确认日志量明显减少（无 `[INFO]` 大量输出）

3. 第二次触发（不改动原生代码），确认 C++ `.cxx` 缓存命中（step 显示 `Cache restored`）

4. 对比两次构建时间
