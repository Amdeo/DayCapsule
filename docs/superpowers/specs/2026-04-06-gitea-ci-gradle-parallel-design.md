# Gitea CI Gradle 并行优化设计

**日期：** 2026-04-06
**目标：** 优化 Gitea Actions 编译 release APK 的速度，预期提速 40–60%
**范围：** `.gitea/workflows/android-release.yml` 和 `.github/workflows/android-release.yml`

---

## 背景

当前构建瓶颈在 Gradle / C++ native 编译阶段。Runner 为自建多核服务器（≥ 8GB 内存），但现有配置强制串行、禁用并行，完全未利用多核优势。

---

## 问题清单

| 问题 | 当前配置 | 影响 |
|------|----------|------|
| 强制串行 | `parallel=false` + `workers.max=1` | 多核全部闲置 |
| 内存不足 | `Xmx2048m` / `MaxMetaspaceSize=512m` | GC 压力大，构建慢 |
| 日志过于详细 | `--info` | 大量 IO，拖慢整体 |
| C++ 缓存键错误 | 包含 `pnpm-lock.yaml` | JS 依赖变动即失效 |
| 全局禁用 daemon | `GRADLE_OPTS: -Dorg.gradle.daemon=false` | 与 `--no-daemon` 重复，无额外价值 |

---

## 方案 A：激进并行（已选定）

### 1. Gradle 并行配置

**`调整 Gradle 以适配 CI` step 改动：**

```bash
# 并行开启，worker 数 = max(nproc - 2, 1)
org.gradle.parallel=true
org.gradle.workers.max=<动态>

# 内存上调（自建服务器内存充足）
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8

# 保留 Gradle 构建缓存
org.gradle.caching=true
```

动态 workers 计算：
```bash
WORKERS=$(( $(nproc) > 2 ? $(nproc) - 2 : 1 ))
```

移除 job 级别的 `GRADLE_OPTS: -Dorg.gradle.daemon=false`（由 `--no-daemon` 标志覆盖已足够）。

### 2. 构建命令日志级别

```bash
# 旧
./gradlew --no-daemon --stacktrace --info assembleRelease

# 新（正常构建去掉 --info，--stacktrace 保留用于失败诊断）
./gradlew --no-daemon --stacktrace --warn assembleRelease
```

失败时已有独立的日志打印分支，无需 `--info` 常驻。

### 3. C++ 缓存键修正

```yaml
# 旧（错误：JS 依赖变化导致 native 缓存失效）
key: native-cxx-...-${{ hashFiles('app/pnpm-lock.yaml') }}

# 新（正确：只在 NDK 版本或原生模块配置变化时失效）
key: native-cxx-${{ runner.os }}-x86_64-ndk${{ env.NDK_VERSION }}-${{ hashFiles('app/android/app/build.gradle', 'app/package.json') }}
restore-keys: |
  native-cxx-${{ runner.os }}-x86_64-ndk${{ env.NDK_VERSION }}-
```

---

## 变更范围

两个文件同步修改（内容保持一致）：
- `.gitea/workflows/android-release.yml`
- `.github/workflows/android-release.yml`

涉及的 step：
1. `调整 Gradle 以适配 CI` / `Tune Gradle for CI`
2. `构建未签名的 Release APK` / `Build unsigned release APK`
3. `缓存原生 C++ 构建产物（.cxx）` / `Cache native C++ build (.cxx)`
4. job 级别 `env` 块（移除 `GRADLE_OPTS`）

---

## 预期效果

- 并行编译：利用全部 CPU 核心，Gradle task 并发执行
- 内存充裕：减少 GC 停顿
- 日志精简：IO 减少，构建输出更清晰
- 缓存命中率提升：纯 JS 改动不再导致 C++ 重新编译
- 综合预期提速：**40–60%**

---

## 风险

- `workers.max` 过高可能导致内存争抢：通过 `nproc - 2` 留余量缓解
- Gradle 并行在极少数情况下可能暴露隐式任务依赖问题：缓存 restore-keys 可回退
