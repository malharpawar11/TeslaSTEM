const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('./polyfills/empty-crypto.js'),
};

// Expo 51's Metro does not resolve package export subpaths by default.
// Resolve Analytics through Node's exports support without changing how
// the rest of the React Native dependency tree is resolved.
config.resolver.resolveRequest = (context, moduleName, platform) =>
  context.resolveRequest(
    context,
    moduleName === '@vercel/analytics/react'
      ? require.resolve('@vercel/analytics/react')
      : moduleName,
    platform,
  );

module.exports = withNativeWind(config, { input: './global.css' });
