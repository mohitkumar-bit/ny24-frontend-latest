const fs = require('fs');
const path = require('path');

/**
 * Expo passes values from app.json as `config`.
 * Keep using that object so expo-doctor stays happy.
 * @type {(args: { config: import('expo/config').ExpoConfig }) => import('expo/config').ExpoConfig}
 */
module.exports = ({ config }) => {
  const next = { ...config };
  const googleServicesPath = path.join(__dirname, 'google-services.json');

  if (fs.existsSync(googleServicesPath)) {
    next.android = {
      ...next.android,
      googleServicesFile: './google-services.json',
    };
  }

  return next;
};
