import type { ComponentProps, ReactNode } from 'react';
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { statsPageStyles as styles } from './StatsPage.styles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface StatsSectionTitleProps {
  children: string;
}

interface StatsInfoCardProps {
  children: ReactNode;
}

interface StatsRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

interface StatsOverviewCardProps {
  icon: IoniconName;
  color: string;
  label: string;
  value: string | number;
}

interface StatsTrendBarProps {
  label: string;
  count: number;
  maxCount: number;
}

export function StatsSectionTitle({ children }: StatsSectionTitleProps) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function StatsInfoCard({ children }: StatsInfoCardProps) {
  return <View style={styles.infoCard}>{children}</View>;
}

export function StatsRow({ label, value, isLast }: StatsRowProps) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function StatsOverviewCard({
  icon,
  color,
  label,
  value,
}: StatsOverviewCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function StatsTrendBar({
  label,
  count,
  maxCount,
}: StatsTrendBarProps) {
  return (
    <View style={styles.barItem}>
      {count > 0 ? <Text style={styles.barCount}>{count}</Text> : null}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { height: Math.max((count / maxCount) * 88, 4) },
          ]}
        />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}
