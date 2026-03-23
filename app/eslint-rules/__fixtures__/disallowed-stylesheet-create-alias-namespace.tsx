import { StyleSheet as RNStyleSheet } from 'react-native';
import * as RN from 'react-native';

const aliasStyles = RNStyleSheet.create({
  container: { padding: 12 },
});

const namespaceStyles = RN.StyleSheet.create({
  container: { marginTop: 8 },
});

export function DisallowedStylesheetCreateAliasNamespace() {
  return (
    <>
      <RN.View style={aliasStyles.container} />
      <RN.View style={namespaceStyles.container} />
    </>
  );
}
