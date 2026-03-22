import { StyleSheet, View } from 'react-native';

type Insets = {
  top: number;
  bottom: number;
};

const insets: Insets = { top: 20, bottom: 10 };
const animatedStyle = { opacity: 0.8 };
const translateX = 12;
const cardWidth = 300;

export function AllowedDynamicStyle() {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        animatedStyle,
        {
          width: cardWidth,
          paddingTop: insets.top,
          transform: [{ translateX }],
        },
      ]}
    />
  );
}
