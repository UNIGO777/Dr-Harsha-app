# Building the Sanchara Android app

Local Gradle build — no EAS account needed.

## Prerequisites

| Tool         | Version used | Notes                                        |
| ------------ | ------------ | -------------------------------------------- |
| JDK          | 17           | `brew install openjdk@17`                    |
| Android SDK  | platform 36  | Android Studio, or `sdkmanager`              |
| Node         | 26.x         |                                              |

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
```

## The API URL is baked in at build time

`EXPO_PUBLIC_*` variables are inlined by Babel when the JS bundle is built, so
**changing `.env` requires a rebuild** — you cannot repoint a shipped APK at a
different server.

Current value (`.env`):

```
EXPO_PUBLIC_API_URL=https://api.drapp.nxtgendigitals.com/api
```

The `/api` suffix matters twice: the backend mounts its router at `/api`, and
`src/lib/media.ts` strips that suffix to reach `/media/...` on the same host for
exercise videos and thumbnails.

> **Stale-cache trap.** Metro caches the *inlined* value. After changing `.env`,
> always build with a cleared cache or you will ship the previous URL — verify
> with the check at the bottom of this file.

## Build

```sh
npx expo prebuild --platform android --clean   # regenerate android/
cd android && ./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

For a Play Store upload use `./gradlew bundleRelease` → `.aab` instead.

## Signing

`credentials/` (gitignored) holds the upload keystore and its passwords.
`plugins/withReleaseSigning.js` injects them into `android/app/build.gradle`
during prebuild.

Two things this deliberately avoids:

- **The Expo template signs `release` with the DEBUG keystore.** That APK
  installs fine but cannot be updated on Play and should never reach a client.
- **`prebuild --clean` deletes `android/` wholesale.** Anything stored in there —
  including a keystore — is destroyed. Hence `credentials/` sits outside it, and
  the signing config is a plugin rather than a hand-edit that would silently
  vanish on the next prebuild.

### ⚠️ Back up `credentials/`

If the keystore is lost, the app **can never be updated on Google Play under the
same listing** — a new key means a new app. Keep a copy in a password manager or
private vault. It is gitignored on purpose.

Fingerprint of the current key (`SHA-256`), for Play Console / API allow-lists:

```
6F:2A:8A:E6:F1:2A:63:B2:8A:CC:E4:E6:79:37:2F:CC:71:8C:34:5F:55:35:6A:77:15:66:91:93:DD:CC:8F:AF
```

## Verify before sending

```sh
./scripts/verify-apk.sh "any string from a screen you changed"
```

Checks the signature, the baked-in API URL, that no dev-machine address leaked
in, and any strings you name.

### Do not hand-roll these checks

Both obvious approaches give a FALSE FAILURE, and each cost real time here:

- **`keytool -printcert -jarfile`** reads only v1 JAR signatures. Release APKs
  are v2/v3-signed with no `META-INF/*.RSA`, so keytool prints nothing and the
  APK looks unsigned. Use `apksigner verify`.

- **`strings | grep` for UI copy.** Hermes stores a string as UTF-16 if it
  contains *any* non-ASCII character — an em dash, a curly quote, `₹`. A plain
  ASCII grep then finds nothing and the string looks absent from the bundle.
  This one triggered a wasted 30-minute full rebuild chasing a non-existent
  stale-cache bug. The script searches both encodings.
