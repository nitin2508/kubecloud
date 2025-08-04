const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  // Check if we have Apple Developer credentials
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('⚠️  Skipping notarization: Apple Developer credentials not found');
    console.log('   For distribution, set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID environment variables');
    return;
  }

  console.log('🍎 Notarizing app...');
  
  try {
    await notarize({
      appBundleId: 'com.kubecloud.app',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });
    console.log('✅ Notarization successful');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}; 