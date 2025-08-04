# macOS Distribution Guide

## The Problem: "App is Damaged" Error

When you distribute your KubeCloud DMG to other users, they see this error:
```
"KubeCloud" is damaged and can't be opened. You should move it to the Bin.
```

This happens because **macOS Gatekeeper** blocks apps that aren't properly signed with a valid Apple Developer certificate.

## Why This Happens

1. **Self-signed certificates** (like your `create-cert.sh` script) only work on the machine where they were created
2. **macOS Gatekeeper** requires apps to be signed with an Apple Developer certificate for distribution
3. **Notarization** is required for apps distributed outside the Mac App Store

## Solutions

### Option 1: Quick Fix for Internal Distribution (Ad-hoc Signing)

**Best for**: Internal team use, testing, personal use

```bash
# Build with ad-hoc signing
npm run dist-adhoc
# or
./scripts/sign-and-build.sh adhoc
```

**Recipients need to run this command once:**
```bash
xattr -dr com.apple.quarantine /Applications/KubeCloud.app
```

### Option 2: Proper Distribution (Apple Developer Certificate)

**Best for**: Public distribution, enterprise use

**Requirements:**
- Apple Developer Account ($99/year)
- Developer ID Application certificate
- App-specific password

**Setup:**
1. **Get Apple Developer Certificate:**
   - Join Apple Developer Program
   - Download "Developer ID Application" certificate
   - Install in Keychain Access

2. **Set Environment Variables:**
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_ID_PASSWORD="your-app-specific-password"  # Generate at appleid.apple.com
   export APPLE_TEAM_ID="your-team-id"  # From Apple Developer portal
   ```

3. **Build:**
   ```bash
   npm run dist-production
   # or
   ./scripts/sign-and-build.sh production
   ```

### Option 3: Development Build (Your Machine Only)

**Best for**: Development, testing on your machine

```bash
npm run dist-unsigned
# or
./scripts/sign-and-build.sh development
```

## Available Build Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run dist-unsigned` | No signing | Development only |
| `npm run dist-adhoc` | Ad-hoc signing | Internal distribution |
| `npm run dist-production` | Full signing + notarization | Public distribution |
| `./scripts/sign-and-build.sh [option]` | Interactive script | All scenarios |

## Troubleshooting

### "No identity found" Error
```bash
# Check available certificates
security find-identity -v -p codesigning

# If empty, you need to install Apple Developer certificate
```

### "Notarization failed" Error
- Check Apple ID credentials
- Ensure app-specific password is correct
- Verify Team ID matches your Apple Developer account

### Users Still Get "Damaged" Error
1. **Check signing:**
   ```bash
   codesign -dvv /path/to/KubeCloud.app
   ```

2. **For ad-hoc signed apps, users must run:**
   ```bash
   xattr -dr com.apple.quarantine /Applications/KubeCloud.app
   ```

## Recommended Workflow

### For Public Distribution:
1. Get Apple Developer account
2. Install certificates
3. Use `./scripts/sign-and-build.sh production`
4. Distribute the DMG freely

### For Internal/Team Use:
1. Use `./scripts/sign-and-build.sh adhoc`
2. Share instructions for running `xattr -dr com.apple.quarantine`
3. Consider using alternative distribution (TestFlight, etc.)

### For Testing:
1. Use `./scripts/sign-and-build.sh development`
2. Test locally only

## Files Created

- `build/entitlements.mac.plist` - Required entitlements for hardened runtime
- `scripts/notarize.js` - Handles Apple notarization process
- `scripts/sign-and-build.sh` - Interactive build script
- Updated `package.json` with new build configurations

## Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Choose your distribution method and build:**
   ```bash
   ./scripts/sign-and-build.sh
   ```

3. **Test the built app on another machine before distributing** 