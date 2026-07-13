// Metro config for Sanchara.
// withNativeWind teaches Metro to compile `global.css` (our Tailwind entry) and
// hot-reload utility classes. `input` points at the CSS file with the @tailwind
// directives at the project root.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
