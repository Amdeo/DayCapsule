/**
 * 本地标签建议服务
 * 基于关键词规则分析文本内容，返回推荐标签
 */

interface TagRule {
  tag: string;
  keywords: string[];
}

const TAG_RULES: TagRule[] = [
  {
    tag: '工作',
    keywords: ['会议', '项目', '需求', '上班', '下班', '同事', '老板', '汇报', '加班', '任务', '截止', 'deadline', '客户', '合同', '提案'],
  },
  {
    tag: '学习',
    keywords: ['读书', '看书', '课程', '笔记', '学习', '考试', '复习', '作业', '论文', '研究', '知识', '技术', '培训', '讲座'],
  },
  {
    tag: '健康',
    keywords: ['运动', '跑步', '健身', '锻炼', '医院', '生病', '感冒', '发烧', '体检', '睡眠', '饮食', '减肥', '瑜伽', '游泳'],
  },
  {
    tag: '美食',
    keywords: ['吃', '喝', '餐厅', '美食', '做饭', '烹饪', '外卖', '早餐', '午餐', '晚餐', '咖啡', '甜点', '火锅', '烧烤'],
  },
  {
    tag: '旅行',
    keywords: ['旅行', '旅游', '出行', '出发', '到达', '景点', '酒店', '机票', '高铁', '地铁', '打车', '导航', '地图', '签证'],
  },
  {
    tag: '家人',
    keywords: ['爸爸', '妈妈', '父母', '爷爷', '奶奶', '外公', '外婆', '兄弟', '姐妹', '孩子', '儿子', '女儿', '家人', '家庭'],
  },
  {
    tag: '朋友',
    keywords: ['朋友', '好友', '同学', '聚会', '聊天', '见面', '约', '玩', '一起', '闺蜜', '哥们'],
  },
  {
    tag: '心情',
    keywords: ['开心', '快乐', '高兴', '兴奋', '幸福', '满足', '感动', '感恩', '难过', '伤心', '失落', '焦虑', '压力', '烦恼', '郁闷', '平静'],
  },
  {
    tag: '思考',
    keywords: ['思考', '想到', '感悟', '反思', '总结', '计划', '目标', '决定', '选择', '纠结', '明白', '理解', '发现', '意识'],
  },
  {
    tag: '娱乐',
    keywords: ['电影', '电视', '剧', '音乐', '歌', '游戏', '综艺', '直播', '视频', '演唱会', '展览', '话剧', '音乐会'],
  },
  {
    tag: '购物',
    keywords: ['买', '购物', '逛街', '网购', '快递', '收到', '退款', '优惠', '打折', '商场', '超市'],
  },
  {
    tag: '天气',
    keywords: ['天气', '下雨', '晴天', '阴天', '下雪', '刮风', '台风', '炎热', '寒冷', '温度', '气温'],
  },
];

const MAX_SUGGESTIONS = 5;

/**
 * 根据文本内容推荐标签
 * @param text 输入文本
 * @param existingTags 已有标签（排除重复）
 * @returns 推荐标签列表（最多 MAX_SUGGESTIONS 个）
 */
export function suggestTags(text: string, existingTags: string[] = []): string[] {
  if (!text.trim()) return [];

  const lower = text.toLowerCase();
  const suggestions: string[] = [];

  for (const rule of TAG_RULES) {
    if (existingTags.includes(rule.tag)) continue;
    if (suggestions.includes(rule.tag)) continue;

    const matched = rule.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      suggestions.push(rule.tag);
    }

    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  return suggestions;
}
