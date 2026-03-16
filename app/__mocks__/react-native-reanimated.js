/**
 * react-native-reanimated mock for Jest
 * Standalone mock that does NOT import the real package,
 * preventing Platform.OS crashes when react-native is incompletely mocked.
 *
 * Compatible with both:
 *  - Tests that rely on this global mock (e.g. index.photo.test.ts)
 *  - Tests that override with their own jest.mock (e.g. EntryCard tests)
 */

const React = require('react');

const noop = () => {};
const identity = (fn) => fn;
const noopAnimated = (value) => value;

function createLayoutAnimation() {
  return {
    duration: () => createLayoutAnimation(),
    delay: () => createLayoutAnimation(),
    springify: () => createLayoutAnimation(),
    easing: () => createLayoutAnimation(),
  };
}

// Animated component wrappers
function createAnimatedComponent(Component) {
  return Component;
}

const Animated = {
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  createAnimatedComponent,
  call: noop,
};

module.exports = {
  default: Animated,
  ...Animated,

  // Shared values
  useSharedValue: (init) => ({ value: init }),
  useAnimatedValue: (init) => ({ value: init }),

  // Animated styles / props
  useAnimatedStyle: (updater) => {
    try { return updater(); } catch { return {}; }
  },
  useAnimatedProps: (updater) => {
    try { return updater(); } catch { return {}; }
  },
  useAnimatedScrollHandler: () => noop,
  useAnimatedGestureHandler: () => ({}),
  useAnimatedRef: () => ({ current: null }),
  useAnimatedReaction: noop,
  useDerivedValue: (fn) => ({ value: fn() }),

  // Animations
  withTiming: (toValue, _config, callback) => {
    if (callback) callback(true);
    return toValue;
  },
  withSpring: (toValue, _config, callback) => {
    if (callback) callback(true);
    return toValue;
  },
  withDecay: noopAnimated,
  withDelay: (_delay, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withRepeat: (animation) => animation,

  // Cancellation
  cancelAnimation: noop,

  // JS/UI bridge
  runOnJS: identity,
  runOnUI: identity,

  // Easing
  Easing: {
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    poly: () => identity,
    sin: identity,
    circle: identity,
    exp: identity,
    elastic: () => identity,
    back: () => identity,
    bounce: identity,
    bezier: () => identity,
    bezierFn: () => identity,
    in: identity,
    out: identity,
    inOut: identity,
  },

  // Utils
  interpolate: (_value, _input, output) => output[0],
  interpolateColor: (_value, _input, output) => output[0],
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  ExtrapolationType: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },

  // Worklets
  makeMutable: (init) => ({ value: init }),
  makeShareable: identity,

  // Color
  processColor: (color) => color,
  ColorSpace: { RGB: 0, HSV: 1 },

  // Layout animations
  Layout: createLayoutAnimation(),
  LinearTransition: createLayoutAnimation(),
  FadeIn: createLayoutAnimation(),
  FadeOut: createLayoutAnimation(),
  SlideInRight: createLayoutAnimation(),
  SlideOutRight: createLayoutAnimation(),
  SlideInUp: createLayoutAnimation(),
  ZoomIn: createLayoutAnimation(),
  ZoomOut: createLayoutAnimation(),
  BounceIn: createLayoutAnimation(),
  BounceOut: createLayoutAnimation(),
  LightSpeedInRight: createLayoutAnimation(),
  LightSpeedOutRight: createLayoutAnimation(),
  FlipInEasyX: createLayoutAnimation(),
  FlipOutEasyX: createLayoutAnimation(),
  StretchInX: createLayoutAnimation(),
  StretchOutX: createLayoutAnimation(),
  FadeInRight: createLayoutAnimation(),
  FadeOutLeft: createLayoutAnimation(),
  Keyframe: class { constructor() {} duration() { return this; } delay() { return this; } },

  // Misc
  measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
  scrollTo: noop,
  setGestureState: noop,
  getRelativePosition: noop,
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  SensorType: {},
  IOSReferenceFrame: {},
  InterfaceOrientation: {},
  KeyboardState: {},
  reanimatedVersion: '4.0.0',

  // Test utilities
  advanceAnimationByFrame: noop,
  advanceAnimationByTime: noop,
  getAnimatedStyle: (ref) => ref?.current?.props?.style ?? {},
};
