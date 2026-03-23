import { View } from 'react-native';

const boxStyle = { padding: 12 };

export function DisallowedStaticInlineStyleVariable() {
  return <View style={boxStyle} />;
}
