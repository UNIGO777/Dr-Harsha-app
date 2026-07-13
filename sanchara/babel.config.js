// Babel config for Sanchara.
// - babel-preset-expo is the required Expo preset. We pass `jsxImportSource:
//   "nativewind"` so JSX compiles against NativeWind's runtime (that's what lets
//   `className` work on React Native components). It also auto-adds the
//   react-native-worklets/reanimated plugin, so we don't list it manually.
// - nativewind/babel wires up the className -> style transform.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
