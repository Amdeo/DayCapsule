export interface HelpFaqItemData {
  question: string;
  answer: string;
}

export const HELP_SUPPORT_EMAIL = 'support@memorycapsule.app';

export const HELP_FAQ_ITEMS: HelpFaqItemData[] = [
  {
    question: '如何添加文字记录？',
    answer: '点击底部蓝色 + 按钮，选择"文字"，输入内容后点击保存。',
  },
  {
    question: '如何录制语音记忆？',
    answer:
      '点击底部 + 按钮，选择"语音"，应用会立即开始录音。点击录音卡片上的暂停/停止按钮控制录音。',
  },
  {
    question: '如何添加照片？',
    answer: '点击底部 + 按钮，选择"照片"，从相册中选择一张照片即可保存。',
  },
  {
    question: '如何搜索记录？',
    answer: '点击顶部搜索框，输入关键词即可实时搜索所有记录的内容和标签。',
  },
  {
    question: '如何按类型筛选？',
    answer:
      '点击搜索框右侧的筛选图标，可以按记录类型（文字/照片/语音）和时间范围进行过滤。',
  },
  {
    question: '如何编辑或删除记录？',
    answer: '长按记录卡片，或点击卡片右上角的菜单按钮，可以选择编辑或删除。',
  },
  {
    question: '数据存储在哪里？',
    answer: '所有数据存储在您的设备本地，不会上传到任何服务器，完全私密安全。',
  },
];
