/**
 * Config plugin: real release signing for the Android build.
 *
 * Expo's Android template signs `release` with the DEBUG keystore, which is
 * fine for a smoke test and wrong for anything handed to a client or uploaded
 * to Play. This rewrites that to a proper signing config.
 *
 * Why a plugin and not a hand-edit of android/app/build.gradle: `expo prebuild`
 * regenerates that file, so a manual edit silently disappears on the next run
 * and the app quietly reverts to debug-signed. This survives.
 *
 * The keystore and its passwords live in ../credentials (gitignored), OUTSIDE
 * the android/ directory — `prebuild --clean` deletes android/ wholesale, and
 * losing the keystore means the app can never be updated on Play again.
 *
 * If the credentials are absent (a fresh clone, CI without secrets), it leaves
 * the debug signing in place and warns, rather than failing the build.
 */
const { withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROPS_FILE = 'release-signing.properties';

function readCredentials(projectRoot) {
  const dir = path.join(projectRoot, 'credentials');
  const file = path.join(dir, PROPS_FILE);
  if (!fs.existsSync(file)) return null;

  const props = Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );

  const storeFile = path.join(dir, props.SANCHARA_STORE_FILE ?? '');
  if (!props.SANCHARA_STORE_FILE || !fs.existsSync(storeFile)) return null;

  return {
    storeFile,
    storePassword: props.SANCHARA_STORE_PASSWORD,
    keyAlias: props.SANCHARA_KEY_ALIAS,
    keyPassword: props.SANCHARA_KEY_PASSWORD,
  };
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    const creds = readCredentials(cfg.modRequest.projectRoot);

    if (!creds) {
      console.warn(
        '[withReleaseSigning] credentials/release-signing.properties not found — ' +
          'release builds will stay DEBUG-SIGNED. Do not ship that.',
      );
      return cfg;
    }

    let gradle = cfg.modResults.contents;

    // 1. Add a `release` signing config next to the existing `debug` one.
    //    Absolute path so it resolves regardless of where gradle is invoked.
    const releaseConfig = `
        release {
            storeFile file('${creds.storeFile}')
            storePassword '${creds.storePassword}'
            keyAlias '${creds.keyAlias}'
            keyPassword '${creds.keyPassword}'
        }`;

    gradle = gradle.replace(
      /(signingConfigs \{\n\s*debug \{[\s\S]*?\n\s{8}\})/,
      `$1\n${releaseConfig}`,
    );

    // 2. Point the release build type at it (template hardcodes signingConfigs.debug).
    gradle = gradle.replace(
      /(release \{\n\s*\/\/ Caution![\s\S]*?\n\s*signingConfig )signingConfigs\.debug/,
      '$1signingConfigs.release',
    );

    if (!gradle.includes('signingConfig signingConfigs.release')) {
      throw new Error(
        '[withReleaseSigning] could not rewrite the release signingConfig — the ' +
          'Expo Android template changed. Update this plugin before shipping.',
      );
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
