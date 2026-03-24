const { withAndroidManifest } = require('expo/config-plugins');

function applyAndroidCleartextTraffic(androidManifest) {
  const mainApplication = androidManifest?.manifest?.application?.[0];

  if (!mainApplication) {
    throw new Error('AndroidManifest.xml is missing the main application node');
  }

  mainApplication.$ = mainApplication.$ || {};
  mainApplication.$['android:usesCleartextTraffic'] = 'true';

  return androidManifest;
}

function withAndroidCleartextTraffic(config) {
  return withAndroidManifest(config, configWithManifest => {
    configWithManifest.modResults = applyAndroidCleartextTraffic(configWithManifest.modResults);
    return configWithManifest;
  });
}

module.exports = withAndroidCleartextTraffic;
module.exports.applyAndroidCleartextTraffic = applyAndroidCleartextTraffic;
