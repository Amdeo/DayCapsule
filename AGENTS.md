# 智能体说明

## 流程要求
- 小问题，不要触发 superpowers，所有使用 `brainstorming` 技能的需求，默认调用 `superpowers` 中创建 `worktree` 的流程，所有修改都在 `worktree` 中实现
- superpowers 流程中设计执行过程中，考虑使用多 subagent 并行

## 编码规范

### 文件规模上限
- 组件 / Hook 文件：≤ 200 行
- Service 文件：≤ 300 行
- Store 文件：≤ 250 行
- 样式文件（`.styles.ts`）：≤ 300 行，超过则按子组件拆分
- 纯工具文件：≤ 250 行，单文件导出 ≤ 12 个

### 函数规模
- 单个函数体：≤ 50 行
- React 组件 JSX return：≤ 60 行，超过则提取子组件
- 嵌套深度：≤ 3 层（`if` / `try` / `callback` 各算一层）

### 路由文件规则（`app/` 目录）
- 路由文件只做 JSX 组装，**不定义业务逻辑函数**
- 业务流程放在 `src/services/` 或 `src/components/<screen>/useXxxController.ts` 中
- DI 接口和测试辅助函数（`...ForTest`）随对应 service 文件存放，不放路由文件

### 拆分模式
- 大 service（> 300 行）→ 子目录 + 门面 re-export（如 `services/voice/voiceRecorder.ts` + `services/voiceService.ts`）
- 大 store（> 250 行）→ Zustand slice 模式（`store/__internal__/xxxSlice.ts`）
- 大组件 → 门面模式（`ComponentName.tsx` 壳 + `component-name/` 子目录）

### 类型安全
- 禁止 `catch (e: any)`，使用 `catch (e: unknown)` + `instanceof` 或类型守卫
- 禁止 `@ts-ignore` / `@ts-expect-error`
- Reanimated 动画值使用 `SharedValue<T>` 而非 `any`

### 单一职责
- 一个文件只做一件事：不混合 UI 构建与业务逻辑
- 数据库层（`database/`）不导入任何 store
- store action 中不包含复杂业务逻辑，委托给 service
- service 不直接调用 `storeXxx.getState()`，通过参数注入或返回值传递状态

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>ui-ux-pro-max</name>
<description>"UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design. Topics: color palette, accessibility, animation, layout, typography, font pairing, spacing, hover, shadow, gradient."</description>
<location>project</location>
</skill>

<skill>
<name>brainstorming</name>
<description>"You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."</description>
<location>global</location>
</skill>

<skill>
<name>dispatching-parallel-agents</name>
<description>Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies</description>
<location>global</location>
</skill>

<skill>
<name>drawio-diagrams-enhanced</name>
<description>Create professional draw.io (diagrams.net) diagrams in XML format (.drawio files) with integrated PMP/PMBOK methodologies, extensive visual asset libraries, and industry-standard professional templates. Use this skill when users ask to create flowcharts, swimlane diagrams, cross-functional flowcharts, org charts, network diagrams, UML diagrams, BPMN, project management diagrams (WBS, Gantt, PERT, RACI), risk matrices, stakeholder maps, or any other visual diagram in draw.io format. This skill includes access to custom shape libraries for icons, clipart, and professional symbols.</description>
<location>global</location>
</skill>

<skill>
<name>executing-plans</name>
<description>Use when you have a written implementation plan to execute in a separate session with review checkpoints</description>
<location>global</location>
</skill>

<skill>
<name>finishing-a-development-branch</name>
<description>Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup</description>
<location>global</location>
</skill>

<skill>
<name>receiving-code-review</name>
<description>Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation</description>
<location>global</location>
</skill>

<skill>
<name>requesting-code-review</name>
<description>Use when completing tasks, implementing major features, or before merging to verify work meets requirements</description>
<location>global</location>
</skill>

<skill>
<name>subagent-driven-development</name>
<description>Use when executing implementation plans with independent tasks in the current session</description>
<location>global</location>
</skill>

<skill>
<name>systematic-debugging</name>
<description>Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes</description>
<location>global</location>
</skill>

<skill>
<name>test-driven-development</name>
<description>Use when implementing any feature or bugfix, before writing implementation code</description>
<location>global</location>
</skill>

<skill>
<name>using-git-worktrees</name>
<description>Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification</description>
<location>global</location>
</skill>

<skill>
<name>using-superpowers</name>
<description>Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions</description>
<location>global</location>
</skill>

<skill>
<name>verification-before-completion</name>
<description>Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always</description>
<location>global</location>
</skill>

<skill>
<name>writing-plans</name>
<description>Use when you have a spec or requirements for a multi-step task, before touching code</description>
<location>global</location>
</skill>

<skill>
<name>writing-skills</name>
<description>Use when creating new skills, editing existing skills, or verifying skills work before deployment</description>
<location>global</location>
</skill>

<skill>
<name>codex-orchestration</name>
<description>Use when executing implementation tasks (single large task OR 2+ independent tasks) where the user wants to visually observe AI working via tmux + interactive codex panels, saving main session tokens. Prerequisites: tmux and codex CLI installed, agent running inside a tmux session.</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
