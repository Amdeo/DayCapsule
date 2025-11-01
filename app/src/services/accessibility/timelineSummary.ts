import {logger} from '@services/telemetry/logger';

export interface TimelineStats {
  totalEntries: number;
  dateRange: {start: Date; end: Date};
  entriesByType: {
    photo: number;
    text: number;
    voice: number;
  };
  entriesByMood?: {
    [mood: string]: number;
  };
  topTags?: Array<{tag: string; count: number}>;
  averageEntriesPerDay: number;
}

export interface TimelineSummary {
  period: 'day' | 'week' | 'month' | 'year';
  summary: string;
  highlights: string[];
  statistics: TimelineStats;
}

/**
 * 时间线图表文本摘要服务
 * 为无障碍用户生成时间线的文本摘要
 */
export class TimelineSummaryService {
  /**
   * 生成日摘要
   */
  generateDaySummary(stats: TimelineStats): string {
    const {totalEntries, entriesByType} = stats;

    if (totalEntries === 0) {
      return '今天没有记录。';
    }

    const parts: string[] = [];
    parts.push(`今天共有 ${totalEntries} 条记录。`);

    if (entriesByType.photo > 0) {
      parts.push(`其中包括 ${entriesByType.photo} 张照片`);
    }
    if (entriesByType.text > 0) {
      parts.push(`${entriesByType.text} 条文字记录`);
    }
    if (entriesByType.voice > 0) {
      parts.push(`${entriesByType.voice} 条语音记录`);
    }

    return parts.join('，') + '。';
  }

  /**
   * 生成周摘要
   */
  generateWeekSummary(stats: TimelineStats): string {
    const {totalEntries, averageEntriesPerDay} = stats;

    if (totalEntries === 0) {
      return '本周没有记录。';
    }

    const parts: string[] = [];
    parts.push(`本周共有 ${totalEntries} 条记录`);
    parts.push(`平均每天 ${averageEntriesPerDay.toFixed(1)} 条`);

    return parts.join('，') + '。';
  }

  /**
   * 生成月摘要
   */
  generateMonthSummary(stats: TimelineStats): string {
    const {totalEntries, averageEntriesPerDay, topTags} = stats;

    if (totalEntries === 0) {
      return '本月没有记录。';
    }

    const parts: string[] = [];
    parts.push(`本月共有 ${totalEntries} 条记录`);
    parts.push(`平均每天 ${averageEntriesPerDay.toFixed(1)} 条`);

    if (topTags && topTags.length > 0) {
      const topTag = topTags[0];
      parts.push(`最常用的标签是"${topTag.tag}"（${topTag.count} 次）`);
    }

    return parts.join('，') + '。';
  }

  /**
   * 生成年摘要
   */
  generateYearSummary(stats: TimelineStats): string {
    const {totalEntries, averageEntriesPerDay, entriesByMood, topTags} = stats;

    if (totalEntries === 0) {
      return '今年没有记录。';
    }

    const parts: string[] = [];
    parts.push(`今年共有 ${totalEntries} 条记录`);
    parts.push(`平均每天 ${averageEntriesPerDay.toFixed(1)} 条`);

    if (entriesByMood) {
      const moods = Object.entries(entriesByMood)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      if (moods.length > 0) {
        const moodTexts = moods.map(([mood, count]) => `${mood}（${count} 次）`);
        parts.push(`主要心情是 ${moodTexts.join('和')}`);
      }
    }

    if (topTags && topTags.length > 0) {
      const topTagTexts = topTags.slice(0, 3).map(t => `"${t.tag}"`);
      parts.push(`最常用的标签是 ${topTagTexts.join('、')}`);
    }

    return parts.join('，') + '。';
  }

  /**
   * 生成完整摘要
   */
  generateFullSummary(
    period: 'day' | 'week' | 'month' | 'year',
    stats: TimelineStats,
  ): TimelineSummary {
    let summary = '';
    const highlights: string[] = [];

    switch (period) {
      case 'day':
        summary = this.generateDaySummary(stats);
        break;
      case 'week':
        summary = this.generateWeekSummary(stats);
        break;
      case 'month':
        summary = this.generateMonthSummary(stats);
        break;
      case 'year':
        summary = this.generateYearSummary(stats);
        break;
    }

    // 生成亮点
    highlights.push(...this.generateHighlights(stats));

    logger.info('Timeline summary generated', {
      period,
      totalEntries: stats.totalEntries,
    });

    return {
      period,
      summary,
      highlights,
      statistics: stats,
    };
  }

  /**
   * 生成亮点
   */
  private generateHighlights(stats: TimelineStats): string[] {
    const highlights: string[] = [];

    // 最活跃的类型
    const {photo, text, voice} = stats.entriesByType;
    const types = [
      {type: '照片', count: photo},
      {type: '文字', count: text},
      {type: '语音', count: voice},
    ].sort((a, b) => b.count - a.count);

    if (types[0].count > 0) {
      highlights.push(`最常记录的是${types[0].type}（${types[0].count} 条）`);
    }

    // 最常用的标签
    if (stats.topTags && stats.topTags.length > 0) {
      const topTag = stats.topTags[0];
      highlights.push(`最常用的标签是"${topTag.tag}"（${topTag.count} 次）`);
    }

    // 记录频率
    if (stats.averageEntriesPerDay > 5) {
      highlights.push('您是一个非常活跃的记录者！');
    } else if (stats.averageEntriesPerDay > 2) {
      highlights.push('您保持着良好的记录习惯。');
    }

    return highlights;
  }

  /**
   * 生成详细的统计文本
   */
  generateDetailedStats(stats: TimelineStats): string {
    const lines: string[] = [];

    lines.push(`总记录数：${stats.totalEntries}`);
    lines.push(`日期范围：${stats.dateRange.start.toLocaleDateString()} 至 ${stats.dateRange.end.toLocaleDateString()}`);
    lines.push(`平均每天：${stats.averageEntriesPerDay.toFixed(1)} 条`);
    lines.push('');
    lines.push('记录类型分布：');
    lines.push(`  照片：${stats.entriesByType.photo} 条`);
    lines.push(`  文字：${stats.entriesByType.text} 条`);
    lines.push(`  语音：${stats.entriesByType.voice} 条`);

    if (stats.entriesByMood && Object.keys(stats.entriesByMood).length > 0) {
      lines.push('');
      lines.push('心情分布：');
      Object.entries(stats.entriesByMood).forEach(([mood, count]) => {
        lines.push(`  ${mood}：${count} 条`);
      });
    }

    if (stats.topTags && stats.topTags.length > 0) {
      lines.push('');
      lines.push('热门标签：');
      stats.topTags.slice(0, 5).forEach(({tag, count}) => {
        lines.push(`  ${tag}：${count} 次`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 生成对比摘要
   */
  generateComparisonSummary(
    currentStats: TimelineStats,
    previousStats: TimelineStats,
  ): string {
    const currentTotal = currentStats.totalEntries;
    const previousTotal = previousStats.totalEntries;
    const change = currentTotal - previousTotal;
    const changePercent = previousTotal > 0 ? ((change / previousTotal) * 100).toFixed(1) : 0;

    if (change > 0) {
      return `相比上期增加了 ${change} 条记录（增长 ${changePercent}%）`;
    } else if (change < 0) {
      return `相比上期减少了 ${Math.abs(change)} 条记录（下降 ${Math.abs(changePercent)}%）`;
    } else {
      return '与上期记录数相同';
    }
  }
}

// 导出单例
export const timelineSummaryService = new TimelineSummaryService();

