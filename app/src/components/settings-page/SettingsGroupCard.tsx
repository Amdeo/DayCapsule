import React from 'react';
import { View } from 'react-native';
import { settingsPageStyles as styles } from './SettingsPage.styles';

interface SettingsGroupCardProps {
  children: React.ReactNode;
}

export function SettingsGroupCard({ children }: SettingsGroupCardProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.groupCard}>
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < childArray.length - 1 && (
            <View style={styles.groupDivider} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}
