import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, FlatList, TextInput} from 'react-native';
import {searchService} from '@services/storage/searchService';
import {logger} from '@services/telemetry/logger';

interface LocationFilterProps {
  selectedLocation: string | null;
  onLocationChange: (location: string | null) => void;
  testID?: string;
}

export const LocationFilter: React.FC<LocationFilterProps> = ({
  selectedLocation,
  onLocationChange,
  testID,
}) => {
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  // 加载可用地点
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoading(true);
        const locations = await searchService.getAvailableLocations();
        setAvailableLocations(locations);
      } catch (error) {
        logger.error('Failed to load locations', {error});
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, []);

  // 过滤地点
  const filteredLocations = availableLocations.filter(location =>
    location.toLowerCase().includes(searchText.toLowerCase()),
  );

  // 切换地点选择
  const handleToggleLocation = (location: string) => {
    if (selectedLocation === location) {
      onLocationChange(null);
    } else {
      onLocationChange(location);
    }
  };

  if (loading) {
    return <Text style={styles.loadingText}>加载中...</Text>;
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* 搜索输入 */}
      <TextInput
        style={styles.searchInput}
        placeholder="搜索地点..."
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* 地点列表 */}
      <FlatList
        data={filteredLocations}
        keyExtractor={item => item}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.location,
              selectedLocation === item && styles.locationSelected,
            ]}
            onPress={() => handleToggleLocation(item)}
          >
            <Text style={styles.locationIcon}>📍</Text>
            <Text
              style={[
                styles.locationText,
                selectedLocation === item && styles.locationTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
        maxHeight={300}
      />

      {filteredLocations.length === 0 && (
        <Text style={styles.emptyText}>
          {availableLocations.length === 0 ? '暂无地点数据' : '未找到匹配的地点'}
        </Text>
      )}

      {/* 清除按钮 */}
      {selectedLocation && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            onLocationChange(null);
            setSearchText('');
          }}
        >
          <Text style={styles.clearButtonText}>清除地点选择</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#333',
    marginBottom: 12,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  locationSelected: {
    backgroundColor: '#007AFF',
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  locationTextSelected: {
    color: '#fff',
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
  clearButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#999',
  },
});

