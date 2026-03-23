import React from 'react';
import { View } from 'react-native';
import { statsPageStyles as styles } from './StatsPage.styles';
import { formatDuration, type StatsSummary } from './statsPageHelpers';
import {
  StatsInfoCard,
  StatsOverviewCard,
  StatsRow,
  StatsSectionTitle,
  StatsTrendBar,
} from './StatsPageItems';

type OverviewStatKey = 'text' | 'photo' | 'voice' | 'total';

interface StatsSectionProps {
  stats: StatsSummary;
}

const OVERVIEW_ITEMS: Array<{
  key: OverviewStatKey;
  icon: React.ComponentProps<typeof StatsOverviewCard>['icon'];
  color: string;
  label: string;
}> = [
  { key: 'text', icon: 'document-text', color: '#A491D3', label: '文字记录' },
  { key: 'photo', icon: 'image', color: '#77C9D4', label: '照片记录' },
  { key: 'voice', icon: 'mic', color: '#F5A623', label: '语音记录' },
  { key: 'total', icon: 'library', color: '#6A89CC', label: '全部记录' },
];

export function StatsOverviewSection({ stats }: StatsSectionProps) {
  return (
    <>
      <StatsSectionTitle>总览</StatsSectionTitle>
      <View testID="stats-overview-grid" style={styles.grid}>
        {OVERVIEW_ITEMS.map((item) => (
          <StatsOverviewCard
            key={item.key}
            icon={item.icon}
            color={item.color}
            label={item.label}
            value={stats[item.key]}
          />
        ))}
      </View>
    </>
  );
}

export function StatsTimeSection({ stats }: StatsSectionProps) {
  return (
    <>
      <StatsSectionTitle>时间维度</StatsSectionTitle>
      <StatsInfoCard>
        <StatsRow label="本周新增" value={`${stats.thisWeek} 条`} />
        <StatsRow label="本月新增" value={`${stats.thisMonth} 条`} />
        <StatsRow label="最活跃的一天" value={stats.busiestDay} isLast={stats.voice === 0} />
        {stats.voice > 0 ? (
          <StatsRow
            label="语音总时长"
            value={formatDuration(stats.totalVoiceDuration)}
            isLast
          />
        ) : null}
      </StatsInfoCard>
    </>
  );
}

export function StatsTrendSection({ stats }: StatsSectionProps) {
  return (
    <>
      <StatsSectionTitle>近6个月趋势</StatsSectionTitle>
      <StatsInfoCard testID="stats-trend-card">
        <View style={styles.barChart}>
          {stats.months.map((month) => (
            <StatsTrendBar
              key={month.label}
              label={month.label}
              count={month.count}
              maxCount={stats.maxCount}
            />
          ))}
        </View>
      </StatsInfoCard>
    </>
  );
}

export function StatsTagsSection({ stats }: StatsSectionProps) {
  if (stats.topTags.length === 0) {
    return null;
  }

  return (
    <>
      <StatsSectionTitle>常用标签</StatsSectionTitle>
      <StatsInfoCard>
        {stats.topTags.map(([tag, count], index) => (
          <StatsRow
            key={tag}
            label={`#${tag}`}
            value={`${count} 条`}
            isLast={index === stats.topTags.length - 1}
          />
        ))}
      </StatsInfoCard>
    </>
  );
}
