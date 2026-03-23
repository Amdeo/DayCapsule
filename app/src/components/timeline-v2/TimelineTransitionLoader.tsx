import React, { useEffect, useRef } from 'react';
import { Animated as RNAnimated, View } from 'react-native';

export function TimelineTransitionLoader() {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;
  const loaderDots = [
    { key: 'text', color: '#A491D3', translateY: dot1 },
    { key: 'photo', color: '#77C9D4', translateY: dot2 },
    { key: 'voice', color: '#F5A623', translateY: dot3 },
  ];

  useEffect(() => {
    const makeBounce = (anim: RNAnimated.Value) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(anim, { toValue: -8, duration: 200, useNativeDriver: true }),
          RNAnimated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      );

    const animation1 = makeBounce(dot1);
    let animation2: RNAnimated.CompositeAnimation;
    let animation3: RNAnimated.CompositeAnimation;

    const timer2 = setTimeout(() => {
      animation2 = makeBounce(dot2);
      animation2.start();
    }, 150);
    const timer3 = setTimeout(() => {
      animation3 = makeBounce(dot3);
      animation3.start();
    }, 300);

    animation1.start();

    return () => {
      animation1.stop();
      clearTimeout(timer2);
      clearTimeout(timer3);
      animation2?.stop();
      animation3?.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {loaderDots.map((dot) => (
          <RNAnimated.View
            key={dot.key}
            testID={`loader-dot-${dot.key}`}
            style={[
              dotStyle,
              { backgroundColor: dot.color },
              { transform: [{ translateY: dot.translateY }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}
