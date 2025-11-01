import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Card, Text, useTheme, ProgressBar} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {TranscriptionStats} from '@services/speechToText/transcriptionStats';

interface TranscriptionStatsCardProps {
  stats: TranscriptionStats;
  testID?: string;
}

/**
 * 转录统计信息卡片组件
 * 显示转录相关的统计数据
 */
export const TranscriptionStatsCard: React.FC<TranscriptionStatsCardProps> = ({stats, testID}) => {
  const theme = useTheme();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) {
      return theme.colors.primary;
    }
    if (confidence >= 0.85) {
      return theme.colors.tertiary;
    }
    if (confidence >= 0.75) {
      return theme.colors.warning;
    }
    return theme.colors.error;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.95) {
      return '优秀';
    }
    if (confidence >= 0.85) {
      return '良好';
    }
    if (confidence >= 0.75) {
      return '一般';
    }
    return '较差';
  };

  return (
    <Card style={styles.card} mode="elevated" testID={testID}>
      <Card.Content>
        {/* 标题 */}
        <View style={styles.header}>
          <Icon name="chart-box" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.title}>
            转录统计
          </Text>
        </View>

        {/* 基本统计 */}
        <View style={styles.section}>
          <Text variant="labelMedium" style={styles.sectionTitle}>
            基本统计
          </Text>
          <View style={styles.statsGrid}>
            <StatItem label="总记录数" value={stats.totalEntries.toString()} icon="file-document" />
            <StatItem
              label="已转录"
              value={stats.totalTranscribedEntries.toString()}
              icon="microphone"
            />
            <StatItem label="总字符数" value={stats.totalCharacters.toString()} icon="text" />
            <StatItem
              label="平均字符数"
              value={stats.averageCharactersPerEntry.toString()}
              icon="calculator"
            />
          </View>
        </View>

        {/* 置信度统计 */}
        <View style={styles.section}>
          <Text variant="labelMedium" style={styles.sectionTitle}>
            置信度分布
          </Text>
          <View style={styles.confidenceContainer}>
            <ConfidenceBar
              label="优秀 (≥95%)"
              count={stats.confidenceDistribution.excellent}
              total={stats.totalTranscribedEntries}
              color={theme.colors.primary}
            />
            <ConfidenceBar
              label="良好 (85-94%)"
              count={stats.confidenceDistribution.good}
              total={stats.totalTranscribedEntries}
              color={theme.colors.tertiary}
            />
            <ConfidenceBar
              label="一般 (75-84%)"
              count={stats.confidenceDistribution.fair}
              total={stats.totalTranscribedEntries}
              color={theme.colors.warning}
            />
            <ConfidenceBar
              label="较差 (<75%)"
              count={stats.confidenceDistribution.poor}
              total={stats.totalTranscribedEntries}
              color={theme.colors.error}
            />
          </View>
          <Text
            variant="bodySmall"
            style={[styles.averageConfidence, {color: theme.colors.onSurfaceVariant}]}>
            平均置信度: {(stats.averageConfidence * 100).toFixed(1)}%
          </Text>
        </View>

        {/* 语言分布 */}
        {Object.keys(stats.languageDistribution).length > 0 && (
          <View style={styles.section}>
            <Text variant="labelMedium" style={styles.sectionTitle}>
              语言分布
            </Text>
            <View style={styles.languageContainer}>
              {Object.entries(stats.languageDistribution).map(([language, count]) => (
                <View key={language} style={styles.languageItem}>
                  <Text variant="bodySmall">{language}</Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.languageCount, {color: theme.colors.primary}]}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 极值统计 */}
        <View style={styles.section}>
          <Text variant="labelMedium" style={styles.sectionTitle}>
            极值统计
          </Text>
          {stats.longestTranscription && (
            <View style={styles.extremeItem}>
              <Icon name="arrow-up" size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.extremeText}>
                最长: {stats.longestTranscription.characters} 字符 (
                {stats.longestTranscription.language})
              </Text>
            </View>
          )}
          {stats.shortestTranscription && (
            <View style={styles.extremeItem}>
              <Icon name="arrow-down" size={16} color={theme.colors.tertiary} />
              <Text variant="bodySmall" style={styles.extremeText}>
                最短: {stats.shortestTranscription.characters} 字符 (
                {stats.shortestTranscription.language})
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

interface StatItemProps {
  label: string;
  value: string;
  icon: string;
}

const StatItem: React.FC<StatItemProps> = ({label, value, icon}) => {
  const theme = useTheme();
  return (
    <View style={styles.statItem}>
      <Icon name={icon} size={20} color={theme.colors.primary} />
      <Text variant="bodySmall" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="titleSmall" style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
};

interface ConfidenceBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({label, count, total, color}) => {
  const percentage = total > 0 ? count / total : 0;
  return (
    <View style={styles.confidenceBar}>
      <View style={styles.confidenceLabel}>
        <Text variant="bodySmall">{label}</Text>
        <Text variant="bodySmall">{count}</Text>
      </View>
      <ProgressBar progress={percentage} color={color} style={styles.progressBar} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginLeft: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  statLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  statValue: {
    marginTop: 4,
    textAlign: 'center',
  },
  confidenceContainer: {
    gap: 8,
    marginBottom: 8,
  },
  confidenceBar: {
    gap: 8,
  },
  confidenceLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  averageConfidence: {
    textAlign: 'center',
    marginTop: 8,
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 4,
  },
  languageCount: {
    marginLeft: 4,
    fontWeight: '600',
  },
  extremeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  extremeText: {
    flex: 1,
  },
});
