#!/usr/bin/env node
/**
 * Local Android EAS build helper.
 * Forces Java 21 (Android Studio JBR) because system JDK 25 breaks Gradle:
 * "Error resolving plugin [id: 'com.facebook.react.settings'] > 25"
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const studioJbr =
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
const jdk25 = '/Library/Java/JavaVirtualMachines/jdk-25.jdk/Contents/Home';

function javaMajorVersion(javaHome) {
  const result = spawnSync(path.join(javaHome, 'bin', 'java'), ['-version'], {
    encoding: 'utf8',
  });
  const output = `${result.stderr || ''}${result.stdout || ''}`;
  const match = output.match(/version "(\d+)/);
  return match ? Number(match[1]) : null;
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    studioJbr,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const javaBin = path.join(candidate, 'bin', 'java');
    if (!fs.existsSync(javaBin)) continue;

    const major = javaMajorVersion(candidate);
    if (major && major <= 21) {
      return candidate;
    }

    if (major && major >= 22) {
      console.warn(
        `Skipping incompatible Java ${major} at ${candidate}. Need Java 17 or 21.`
      );
    }
  }

  if (fs.existsSync(path.join(jdk25, 'bin', 'java'))) {
    console.error(
      '\nAndroid builds cannot use JDK 25.\n' +
        'Use Android Studio Java instead:\n\n' +
        '  npm run build:android:local\n\n' +
        'Or run manually:\n' +
        `  export JAVA_HOME="${studioJbr}"\n` +
        '  eas build --platform android --profile preview --local\n'
    );
    process.exit(1);
  }

  console.error(
    'No compatible Java found. Install Android Studio or set JAVA_HOME to JDK 17/21.'
  );
  process.exit(1);
}

const javaHome = resolveJavaHome();
const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH || ''}`,
  ANDROID_HOME:
    process.env.ANDROID_HOME || path.join(process.env.HOME || '', 'Library/Android/sdk'),
  ANDROID_SDK_ROOT:
    process.env.ANDROID_SDK_ROOT ||
    process.env.ANDROID_HOME ||
    path.join(process.env.HOME || '', 'Library/Android/sdk'),
  NODE_ENV: process.env.NODE_ENV || 'production',
};

console.log(`Using JAVA_HOME=${javaHome}`);
const version = spawnSync(path.join(javaHome, 'bin', 'java'), ['-version'], {
  encoding: 'utf8',
});
process.stderr.write(version.stderr || version.stdout || '');

const result = spawnSync(
  'eas',
  ['build', '--platform', 'android', '--profile', 'preview', '--local'],
  {
    env,
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: process.platform === 'win32',
  }
);

process.exit(result.status ?? 1);
