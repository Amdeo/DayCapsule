import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, FlatList} from 'react-native';
import {searchService} from '@services/storage/searchService';
import {logger} from '@services/telemetry/logger';

interface MoodFilterProps {
  selectedMood: string | null;
  onMoodChange: (mood: string | null) => void;
  testID?: string;
}

const MOOD_EMOJIS: {[key: string]: string} = {
  开心: '😊',
  平静: '😌',
  伤心: '😢',
  愤怒: '😠',
  惊讶: '😲',
  恐惧: '😨',
  厌恶: '🤢',
  期待: '🤩',
};

export const MoodFilter: React.FC<MoodFilterProps> = ({
  selectedMood,
  onMoodChange,
  testID,
}) => {
  const [availableMoods, setAvailableMoods] = useState<Array<{mood: string; count: number}>>([]);
  const [loading, setLoading] = useState(true);

  // 加载可用心情
  useEffect(() => {
    const loadMoods = async () => {
      try {
        setLoading(true);
        const moods = await searchService.getMoodStats();
        setAvailableMoods(moods);
      } catch (error) {
        logger.error('Failed to load moods', {error});
      } finally {
        setLoading(false);
      }
    };
    loadMoods();
  }, []);

  // 切换心情选择
  const handleToggleMood = (mood: string) => {
    if (selectedMood === mood) {
      onMoodChange(null);
    } else {
      onMoodChange(mood);
    }
  };

  if (loading) {
    return <Text style={styles.loadingText}>加载中...</Text>;
  }

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={availableMoods}
        keyExtractor={item => item.mood}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.mood,
              selectedMood === item.mood && styles.moodSelected,
            ]}
            onPress={() => handleToggleMood(item.mood)}
          >
            <Text style={styles.moodEmoji}>{MOOD_EMOJIS[item.mood] || '😐'}</Text>
            <View style={styles.moodInfo}>
              <Text
                style={[
                  styles.moodText,
                  selectedMood === item.mood && styles.moodTextSelected,
                ]}
              >
                {item.mood}
              </Text>
              <Text style={styles.moodCount}>({item.count})</Text>
            </View>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />

      {availableMoods.length === 0 && (
        <Text style={styles.emptyText}>暂无心情数据</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  mood: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  moodSelected: {
    backgroundColor: '#007AFF',
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  moodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  moodTextSelected: {
    color: '#fff',
  },
  moodCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

