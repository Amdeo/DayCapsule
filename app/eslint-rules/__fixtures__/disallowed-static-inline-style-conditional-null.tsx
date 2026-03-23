import { View } from 'react-native';

declare const cond: boolean;

export function DisallowedStaticInlineStyleConditionalNull() {
  return <View style={cond ? { padding: 12 } : null} />;
}
