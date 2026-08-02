#!/bin/bash
# ═══════════════════════════════════════════════════
# ROM Player by Coops — Deploy Script
# Run this instead of netlify deploy --prod
# It stamps the version automatically then deploys.
#
# Usage:  ./deploy.sh
# ═══════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HTML_FILE="$SCRIPT_DIR/index.html"
VERSION_FILE="$SCRIPT_DIR/version.json"
SW_FILE="$SCRIPT_DIR/sw.js"

# Generate version from current timestamp
VERSION=$(date -u +"%Y%m%d%H%M%S")
echo "🔖 Stamping version: $VERSION"

# Stamp version into index.html
sed -i.bak "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$VERSION'/" "$HTML_FILE"
rm -f "$HTML_FILE.bak"

# Write version.json so the app can check for updates
echo "{ \"version\": \"$VERSION\" }" > "$VERSION_FILE"

# Bump the service worker cache version too, so old cached
# assets never linger across deploys.
sed -i.bak "s/const CACHE_VERSION = '[^']*'/const CACHE_VERSION = 'rp-$VERSION'/" "$SW_FILE"
rm -f "$SW_FILE.bak"

echo "✅ Version stamped (index.html, version.json, sw.js)"
echo "🚀 Deploying to Netlify..."

# Deploy
netlify deploy --prod --dir="$SCRIPT_DIR"

echo ""
echo "✨ Done! Version $VERSION is live."
