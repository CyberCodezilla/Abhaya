/**
 * Expo Config Plugin: withAbhayaForegroundService
 * ═══════════════════════════════════════════════════════
 * Modifies the Android build to support the foreground service.
 *
 * WHAT IT DOES:
 * 1. Adds required permissions to AndroidManifest.xml
 * 2. Registers the foreground service declaration
 * 3. Registers the boot receiver
 *
 * HOW TO USE:
 * In app.json plugins array:
 *   "./plugins/withAbhayaForegroundService"
 *
 * NOTE: This plugin supplements the manual AndroidManifest changes.
 * During EAS Build, the prebuild step regenerates the manifest,
 * so this plugin ensures our additions survive.
 */

const { withAndroidManifest } = require('expo/config-plugins');

function withAbhayaForegroundService(config) {
  // Modify AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // ── 1. Ensure permissions are present ──
    const requiredPermissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.CALL_PHONE',
      'android.permission.SEND_SMS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    ];

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const existingPermissions = manifest['uses-permission'].map(
      (p) => p.$?.['android:name']
    );

    for (const perm of requiredPermissions) {
      if (!existingPermissions.includes(perm)) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    // ── 2. Add foreground service declaration ──
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      // Check if service already exists
      const serviceExists = application.service.some(
        (s) => s.$?.['android:name'] === '.AbhayaForegroundService'
      );

      if (!serviceExists) {
        application.service.push({
          $: {
            'android:name': '.AbhayaForegroundService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'microphone|location',
          },
        });
      }

      // ── 3. Add boot receiver ──
      if (!application.receiver) {
        application.receiver = [];
      }

      const receiverExists = application.receiver.some(
        (r) => r.$?.['android:name'] === '.BootReceiver'
      );

      if (!receiverExists) {
        application.receiver.push({
          $: {
            'android:name': '.BootReceiver',
            'android:enabled': 'true',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                { $: { 'android:name': 'android.intent.action.LOCKED_BOOT_COMPLETED' } },
              ],
            },
          ],
        });
      }
    }

    return config;
  });

  return config;
}

module.exports = withAbhayaForegroundService;
