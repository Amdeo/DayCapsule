import {
  Gesture,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const DISMISS_THRESHOLD = 80;

interface UseImageViewerGesturesOptions {
  screenHeight: number;
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedTranslateX: SharedValue<number>;
  savedTranslateY: SharedValue<number>;
  dismissY: SharedValue<number>;
  dismissScale: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  panMode: SharedValue<0 | 1>;
  onTriggerClose: (capturedDismissY?: number) => void;
  onShowActionSheet: () => void;
}

export function useImageViewerGestures({
  screenHeight,
  scale,
  savedScale,
  translateX,
  translateY,
  savedTranslateX,
  savedTranslateY,
  dismissY,
  dismissScale,
  backdropOpacity,
  panMode,
  onTriggerClose,
  onShowActionSheet,
}: UseImageViewerGesturesOptions) {
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      runOnJS(onTriggerClose)(0);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(onShowActionSheet)();
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, 0.5), 5);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      panMode.value = scale.value >= 0.9 && scale.value <= 1.1 ? 1 : 0;
    })
    .onUpdate((event) => {
      if (panMode.value === 1 && event.translationY > 0) {
        dismissY.value = event.translationY;
        dismissScale.value = Math.min(
          Math.max(1 - (event.translationY / screenHeight) * 0.8, 0.6),
          1,
        );
        backdropOpacity.value = Math.min(
          Math.max(1 - (event.translationY / screenHeight) * 1.5, 0),
          1,
        );
      } else if (panMode.value === 0) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      panMode.value = 0;
      if (dismissY.value > DISMISS_THRESHOLD) {
        runOnJS(onTriggerClose)(dismissY.value);
      } else if (dismissY.value > 0) {
        dismissY.value = withSpring(0);
        dismissScale.value = withSpring(1);
        backdropOpacity.value = withSpring(1);
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    })
    .onFinalize(() => {
      panMode.value = 0;
    });

  return Gesture.Race(
    singleTapGesture,
    doubleTapGesture,
    longPressGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );
}
