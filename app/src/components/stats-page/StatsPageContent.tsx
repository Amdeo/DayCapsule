import React from 'react';
import { ScrollView, View } from 'react-native';
import {
  StatsOverviewSection,
  StatsTagsSection,
  StatsTimeSection,
  StatsTrendSection,
} from './StatsPageSections';
import { statsPageStyles as styles } from './StatsPage.styles';
import { useStatsPageController } from './useStatsPageController';

export function StatsPageContent() {
  const { stats } = useStatsPageController();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <StatsOverviewSection stats={stats} />
      <StatsTimeSection stats={stats} />
      <StatsTrendSection stats={stats} />
      <StatsTagsSection stats={stats} />
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}
