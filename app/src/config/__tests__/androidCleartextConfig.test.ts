describe('android cleartext config plugin', () => {
  it('enables cleartext traffic for the Android application manifest', () => {
    const { applyAndroidCleartextTraffic } = require('../../../plugins/withAndroidCleartextTraffic');

    const manifest = {
      manifest: {
        application: [
          {
            $: {
              'android:name': '.MainApplication',
            },
          },
        ],
      },
    };

    const updatedManifest = applyAndroidCleartextTraffic(manifest);

    expect(updatedManifest.manifest.application[0].$['android:usesCleartextTraffic']).toBe('true');
  });
});
