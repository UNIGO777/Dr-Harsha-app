#!/usr/bin/env bash
#
# Verify a release APK before it goes to anyone.
#
# Checks signature, the baked-in API URL, and any strings you name on the
# command line, e.g.
#
#   ./scripts/verify-apk.sh "I play sports" "Pre-pregnancy fitness"
#
# TWO TRAPS this exists to avoid — both of which produced a false "the build is
# broken" during development:
#
#  1. `keytool -printcert -jarfile` reads only v1 JAR signatures. Release APKs
#     are v2/v3-signed and have no META-INF/*.RSA, so keytool reports nothing
#     and the APK looks unsigned. Use apksigner.
#
#  2. Hermes stores a string as UTF-16 if it contains ANY non-ASCII character —
#     an em dash, a curly quote, "₹". A plain byte-grep for ASCII then finds
#     nothing and the string looks absent from the bundle. Search both
#     encodings.
#
set -euo pipefail

APK="${APK:-android/app/build/outputs/apk/release/app-release.apk}"
[ -f "$APK" ] || { echo "No APK at $APK"; exit 1; }

ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
APKSIGNER=$(ls "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)

echo "APK      : $APK"
echo "size     : $(ls -lh "$APK" | awk '{print $5}')"
echo "built    : $(date -r "$APK" '+%Y-%m-%d %H:%M:%S')"
echo

echo "── signature (apksigner, NOT keytool) ──"
"$APKSIGNER" verify -v --print-certs "$APK" 2>/dev/null \
  | grep -E "^Verifies|APK Signature Scheme v2|certificate DN|certificate SHA-256" \
  | sed 's/^/  /'
echo

BUNDLE=$(mktemp -t sanchara-bundle)
unzip -o -q -p "$APK" assets/index.android.bundle > "$BUNDLE"

echo "── contents ──"
python3 - "$BUNDLE" "$@" <<'PY'
import sys
path, needles = sys.argv[1], sys.argv[2:]
data = open(path, 'rb').read()

def found(s: str) -> str:
    # Hermes: ASCII-only strings live in the ASCII table; anything containing a
    # non-ASCII char is stored UTF-16. Check both before declaring it missing.
    if data.count(s.encode('utf-8')):     return 'present (ascii)'
    if data.count(s.encode('utf-16-le')): return 'present (utf-16)'
    return 'MISSING'

checks = ['https://api.drapp.nxtgendigitals.com/api', *needles]
bad = 0
for c in checks:
    r = found(c)
    if r == 'MISSING': bad += 1
    print(f'  {r:<18} {c}')

# Anything pointing at a dev machine must never ship.
for leak in ['192.168.', 'localhost:5055', '10.0.2.2']:
    if data.count(leak.encode()):
        print(f'  LEAK               {leak} is in the bundle')
        bad += 1

print()
print('  FAILED' if bad else '  all checks passed')
sys.exit(1 if bad else 0)
PY
rm -f "$BUNDLE"
