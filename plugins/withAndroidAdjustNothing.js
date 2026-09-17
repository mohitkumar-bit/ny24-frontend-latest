const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Use adjustResize so react-native-keyboard-controller can read real IME insets
 * (WhatsApp-style). Do not use adjustNothing — that breaks inset-based keyboard sync.
 */
function withAndroidAdjustResize(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application?.activity) return config;

    for (const activity of application.activity) {
      const name = activity.$?.["android:name"] || "";
      if (name === ".MainActivity" || name.endsWith(".MainActivity")) {
        activity.$["android:windowSoftInputMode"] = "adjustResize";
      }
    }
    return config;
  });
}

module.exports = withAndroidAdjustResize;
