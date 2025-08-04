#!/bin/bash

# KubeCloud Internal Distribution Build Script
# This builds and signs the app for internal distribution

set -e

echo "🚀 Building KubeCloud for internal distribution..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Build the app
echo "🔨 Building the app..."
npm run build
npx electron-builder --mac --publish=never

# Apply ad-hoc signing to the app
echo "✍️  Applying ad-hoc code signing..."
codesign --force --deep --sign - "dist/mac-arm64/KubeCloud.app"

# Verify signing
echo "🔍 Verifying signature..."
codesign -dvv "dist/mac-arm64/KubeCloud.app" | head -5

# Create a simple zip for easy distribution
echo "📦 Creating distribution package..."
cd dist/mac-arm64
zip -r "../KubeCloud-Internal-Distribution.zip" "KubeCloud.app"
cd ../..

echo ""
echo "✅ Build complete!"
echo ""
echo "📂 Distribution files created:"
echo "   • dist/KubeCloud-1.0.0-arm64.dmg (DMG installer)"
echo "   • dist/KubeCloud-Internal-Distribution.zip (App bundle)"
echo ""
echo "📋 Instructions for recipients:"
echo "   1. Download and install the app"
echo "   2. If you get a 'damaged' warning, run:"
echo "      xattr -dr com.apple.quarantine /Applications/KubeCloud.app"
echo ""
echo "🎉 Ready for internal distribution!" 