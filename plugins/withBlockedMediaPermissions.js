const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Strip broad media permissions so Play Console accepts the app.
 * Images use Android photo picker; videos are not read from device storage.
 */
function withBlockedMediaPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];

    const blocked = new Set([
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ]);

    manifest['uses-permission'] = permissions.filter((entry) => {
      const name = entry.$?.['android:name'];
      return !blocked.has(name);
    });

    return config;
  });
}

module.exports = withBlockedMediaPermissions;
