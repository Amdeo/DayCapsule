import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, FlatList} from 'react-native';
import {Card, Text, Button, useTheme, Divider, Chip} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {TranscriptionVersion} from '@services/speechToText/transcriptionHistory';

interface TranscriptionHistoryViewerProps {
  versions: TranscriptionVersion[];
  currentVersionId: string;
  onVersionSelect?: (version: TranscriptionVersion) => void;
  onVersionDelete?: (versionId: string) => void;
  testID?: string;
}

/**
 * 转录历史查看器组件
 * 显示转录文本的版本历史
 */
export const TranscriptionHistoryViewer: React.FC<TranscriptionHistoryViewerProps> = ({
  versions,
  currentVersionId,
  onVersionSelect,
  onVersionDelete,
  testID,
}) => {
  const theme = useTheme();
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'auto':
        return 'robot';
      case 'manual':
        return 'pencil';
      case 'edit':
        return 'pencil-box';
      default:
        return 'file-document';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'auto':
        return '自动转录';
      case 'manual':
        return '手动输入';
      case 'edit':
        return '编辑';
      default:
        return '未知';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'auto':
        return theme.colors.primary;
      case 'manual':
        return theme.colors.tertiary;
      case 'edit':
        return theme.colors.warning;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  const renderVersionItem = ({item}: {item: TranscriptionVersion}) => {
    const isCurrent = item.id === currentVersionId;
    const isExpanded = expandedVersionId === item.id;

    return (
      <View key={item.id} style={styles.versionItem}>
        <Card
          style={[
            styles.versionCard,
            isCurrent && {borderColor: theme.colors.primary, borderWidth: 2},
          ]}
          mode="outlined">
          <Card.Content>
            {/* 版本头部 */}
            <View style={styles.versionHeader}>
              <View style={styles.versionInfo}>
                <Icon
                  name={getSourceIcon(item.source)}
                  size={20}
                  color={getSourceColor(item.source)}
                />
                <View style={styles.versionMeta}>
                  <Text variant="labelMedium" style={styles.sourceLabel}>
                    {getSourceLabel(item.source)}
                  </Text>
                  <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>
              </View>
              <View style={styles.versionBadges}>
                {isCurrent && (
                  <Chip
                    size="small"
                    icon="check-circle"
                    style={{backgroundColor: theme.colors.primary}}>
                    <Text>当前</Text>
                  </Chip>
                )}
                <Chip size="small" icon="percent">
                  <Text>{(item.confidence * 100).toFixed(0)}%</Text>
                </Chip>
              </View>
            </View>

            {/* 版本内容预览 */}
            <Text
              variant="bodySmall"
              numberOfLines={isExpanded ? undefined : 2}
              style={[styles.versionText, {color: theme.colors.onSurface}]}>
              {item.text}
            </Text>

            {/* 版本备注 */}
            {item.notes && (
              <View style={styles.notesContainer}>
                <Text variant="labelSmall" style={{color: theme.colors.onSurfaceVariant}}>
                  备注: {item.notes}
                </Text>
              </View>
            )}

            {/* 操作按钮 */}
            <View style={styles.actionButtons}>
              <Button
                mode="text"
                size="small"
                onPress={() => setExpandedVersionId(isExpanded ? null : item.id)}>
                {isExpanded ? '收起' : '展开'}
              </Button>
              {!isCurrent && (
                <>
                  <Button
                    mode="text"
                    size="small"
                    onPress={() => onVersionSelect?.(item)}>
                    恢复
                  </Button>
                  <Button
                    mode="text"
                    size="small"
                    textColor={theme.colors.error}
                    onPress={() => onVersionDelete?.(item.id)}>
                    删除
                  </Button>
                </>
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (versions.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={testID}>
        <Icon name="history" size={48} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant, marginTop: 8}}>
          暂无历史记录
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={versions}
        renderItem={renderVersionItem}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionItem: {
    marginBottom: 8,
  },
  versionCard: {
    marginHorizontal: 0,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  versionMeta: {
    flex: 1,
  },
  sourceLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  versionBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  versionText: {
    marginBottom: 8,
    lineHeight: 20,
  },
  notesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 4,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 4,
  },
  divider: {
    marginVertical: 8,
  },
});

