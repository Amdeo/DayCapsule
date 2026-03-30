import type { ComponentProps } from 'react';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ViewMode } from './timelineTypes';
import { viewModeToggleStyles as styles } from './Timeline.v2.styles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const VIEW_MODES: { mode: ViewMode; icon: IoniconName; label: string }[] = [
  { mode: 'list', icon: 'list', label: '列表' },
  { mode: 'calendar', icon: 'calendar', label: '日历' },
];

interface TimelineViewModeToggleProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function TimelineViewModeToggle({
  current,
  onChange,
}: TimelineViewModeToggleProps) {
  return (
    <View style={styles.container}>
      {VIEW_MODES.map(({ mode, icon, label }) => {
        const active = current === mode;
        return (
          <TouchableOpacity
            key={mode}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(mode)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={icon}
              size={16}
              color={active ? '#6A89CC' : '#A3A3A3'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
