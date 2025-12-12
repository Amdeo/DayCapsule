import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Animated as RNAnimated, Dimensions, Platform } from 'react-native';
import { useTheme, IconButton, Button } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, useAnimatedGestureHandler, runOnJS } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

interface SearchOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSearch: (query: string, filters?: any) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TRANSLATE_Y_OFFSET = -SCREEN_HEIGHT; // Start off-screen above

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isVisible, onClose, onSearch }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);

  const translateY = useSharedValue(TRANSLATE_Y_OFFSET);

  useEffect(() => {
    translateY.value = withTiming(isVisible ? 0 : TRANSLATE_Y_OFFSET, { duration: 300 });
  }, [isVisible]);

  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      if (event.translationY > 50) {
        // Swipe down to close
        translateY.value = withTiming(TRANSLATE_Y_OFFSET, {}, () => {
          runOnJS(onClose)();
        });
      } else {
        // Snap back to open
        translateY.value = withTiming(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleSearchPress = () => {
    onSearch(searchQuery);
  };

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
      >
        <Animated.View style={styles.panHandlerArea}>
          <View style={styles.header}>
            <IconButton icon="arrow-left" size={24} onPress={onClose} />
            <Text style={styles.title}>搜索</Text>
            <IconButton icon="filter-variant" size={24} onPress={() => setIsFilterPanelVisible(!isFilterPanelVisible)} />
          </View>

          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索记录..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchPress}
            />
            <IconButton icon="magnify" size={24} onPress={handleSearchPress} />
          </View>

          {isFilterPanelVisible && (
            <View style={styles.filterPanel}>
              <Text style={styles.filterText}>筛选器内容 (TODO)</Text>
              <Button mode="contained" onPress={() => console.log('Apply Filters')}><Text>应用筛选</Text></Button>
            </View>
          )}

          <View style={styles.searchResults}>
            <Text style={styles.resultsText}>搜索结果显示在此 (TODO)</Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 400,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  panHandlerArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  filterPanel: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.outline,
  },
  filterText: {
    color: theme.colors.onSurface,
    marginBottom: 10,
  },
  searchResults: {
    flex: 1,
    marginTop: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsText: {
    color: theme.colors.onBackground,
    fontSize: 16,
  },
});

export default SearchOverlay;
