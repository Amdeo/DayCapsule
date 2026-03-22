import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
});

export function DisallowedStyleSheetCreate() {
  return <View style={styles.container} />;
}
