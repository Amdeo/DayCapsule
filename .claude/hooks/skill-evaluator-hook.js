#!/usr/bin/env node
// Claude Code Hook: 技能评估与激活
// 根据 .claude/skills/ 目录下的 skills 自动评估并激活

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || data.text || '').toLowerCase();

    const skills = detectSkills(prompt);

    if (skills.length > 0) {
      const list = skills.map(s => `- **${s.name}**: ${s.keywords.join(' / ')}`).join('\n');
      const instruction = `### 指令：技能激活流程 (必须执行)

#### 步骤 1 — 评估
针对以下每个技能，陈述： [技能名] - 是/否 - [理由]

${list}

#### 步骤 2 — 激活
如果任何技能为"是" → 立即使用 Skill() 工具激活对应技能
如果所有技能为"否" → 说明"不需要技能"并继续

#### 步骤 3 — 实现
只有在步骤 2 完成后，才能开始实现。`.trim();

      console.log(instruction);
    }

    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
});

// 根据 .claude/skills/ 目录配置
const SKILL_KEYWORDS = {
  // Flutter 核心开发技能
  'flutter-development': [
    'flutter', '移动端', '手机app', '跨平台', 'mobile', 'dart',
    'pubspec', 'provider', 'statelesswidget', 'statefulwidget',
    '屏幕', '页面', 'screen', 'widget', '热重载', 'hot reload'
  ],

  // Flutter API 参考
  'flutter-api': [
    'widget', '组件', 'material', 'cupertino', '动画', 'animation',
    '手势', 'gesture', '导航', 'navigation', 'api文档', 'sdk',
    'textfield', 'listview', 'scaffold', 'navigationbar', 'dialog'
  ],

  // Flutter UI 组件 (M3)
  'flutter-ui-components': [
    'm3', 'material3', 'ui组件', '按钮', 'button', '卡片', 'card',
    '表单', 'form', '输入框', 'input', '设计系统', 'design system',
    '组件迁移', 'migrate', 'wcag', '无障碍', 'accessibility'
  ],

  // Moai Flutter 专家 (现代 Flutter 模式)
  'moai-lang-flutter': [
    'riverpod', 'go_router', '状态管理', 'state management',
    '路由', 'deeplink', '深链接', '代码生成', 'codegen',
    'extension type', 'record', 'sealed class', 'pattern match',
    'adaptive', '响应式', 'consumerwidget', 'provider'
  ],

  // 前端设计
  'frontend-design': [
    '前端', 'web', 'react', 'vue', 'html', 'css', '设计',
    'ui设计', '界面', '组件', 'landing page', 'dashboard',
    '网页', 'website', '样式', 'animation', '动画效果'
  ],

  // Canvas/绘图设计
  'canvas-design': [
    'canvas', '绘图', '绘制', '画布', '设计', 'poster',
    '海报', '艺术', '可视化', 'graphics', 'svg', 'canvas设计'
  ]
};

function detectSkills(prompt) {
  const matched = [];

  for (const [skillName, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => prompt.includes(kw.toLowerCase()))) {
      matched.push({ name: skillName, keywords });
    }
  }

  return matched;
}
