import { MaterialIcons } from '@expo/vector-icons';
import { selectEntries } from '@store/slices/entriesSlice';
import { LoadingIndicator } from '@ui/components';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Avatar,
    Card,
    useTheme
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

export const TimelineScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const entries = useSelector(selectEntries);

  useEffect(() => {
    setIsLoading(true);
    // 模拟加载数据
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (isLoading) {
    return <LoadingIndicator message="加载时间线..." />;
  }

  const handleCreateEntry = () => {
    console.log('创建新记录');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {entries.map((entry: any, index: number) => (
          <Card key={entry.id} style={[styles.entryCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.entryHeader}>
                <Avatar.Icon 
                  size={40} 
                  icon="notes"
                  style={{ backgroundColor: theme.colors.tertiary }}
                />
                <View style={styles.entryInfo}>
                  <Text style={styles.entryTime}>
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </Text>
                  <Text style={styles.entryContent}>
                    {entry.content || '示例记录内容'}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
      
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreateEntry}
      >
        <MaterialIcons name="add" size={24} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  entryCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  entryTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  entryContent: {
    fontSize: 16,
    color: '#333',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6A89CC',
    elevation: 4,
  },
});

export default TimelineScreen;
