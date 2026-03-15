/**
 * react-native-worklets mock for Jest
 * Prevents Platform.OS access crash when react-native is incompletely mocked.
 */

const noop = () => {};
const identity = (fn) => fn;

module.exports = {
  // threads
  runOnJS: identity,
  runOnUI: identity,
  runOnUISync: identity,
  runOnUIAsync: identity,
  executeOnUIRuntimeSync: () => noop,
  scheduleOnRN: noop,
  scheduleOnUI: noop,
  callMicrotasks: noop,
  unstable_eventLoopTask: noop,

  // shareables
  makeShareable: identity,
  makeShareableCloneOnUIRecursive: identity,
  makeShareableCloneRecursive: identity,
  isShareableRef: () => false,
  shareableMappingCache: { get: noop, set: noop, has: () => false },

  // serializable
  createSerializable: noop,
  isSerializableRef: () => false,
  serializableMappingCache: { get: noop, set: noop, has: () => false },

  // runtimes
  createWorkletRuntime: noop,
  runOnRuntime: noop,

  // synchronizable
  isSynchronizable: () => false,
  createSynchronizable: noop,

  // featureFlags
  getStaticFeatureFlag: () => false,
  setDynamicFeatureFlag: noop,

  // runtimeKind
  getRuntimeKind: () => 0,
  RuntimeKind: { ReactNative: 0, WebAssembly: 1 },

  // workletFunction
  isWorkletFunction: () => false,

  // WorkletsModule
  WorkletsModule: {},
};
