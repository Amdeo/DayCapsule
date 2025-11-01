import React, {useCallback} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, ScrollView} from 'react-native';

export type ViewType = 'day' | 'week' | 'month' | 'year';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onGoToToday: () => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
  onGoToToday,
}) => {
  const views: {label: string; value: ViewType}[] = [
    {label: '日', value: 'day'},
    {label: '周', value: 'week'},
    {label: '月', value: 'month'},
    {label: '年', value: 'year'},
  ];

  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (view !== currentView) {
        onViewChange(view);
      }
    },
    [currentView, onViewChange],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.viewsContainer}
      >
        {views.map(view => (
          <TouchableOpacity
            key={view.value}
            style={[
              styles.viewButton,
              currentView === view.value && styles.viewButtonActive,
            ]}
            onPress={() => handleViewChange(view.value)}
            testID={`${view.value}_view_button`}
          >
            <Text
              style={[
                styles.viewButtonText,
                currentView === view.value && styles.viewButtonTextActive,
              ]}
            >
              {view.label}视图
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.todayButton}
        onPress={onGoToToday}
        testID="go_to_today_button"
      >
        <Text style={styles.todayButtonText}>今天</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewsContainer: {
    flex: 1,
    marginRight: 12,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  viewButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  viewButtonTextActive: {
    color: '#fff',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});

