import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GeoHunt',
  slug: 'geohunt',
  owner: 'guasc0',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.geohunt.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'GeoHunt needs your location to play the game.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'GeoHunt needs your location to track your position during gameplay.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSExceptionDomains: {
          'localhost': {
            NSExceptionAllowsInsecureHTTPLoads: true,
          },
          '192.168.1.194': {
            NSExceptionAllowsInsecureHTTPLoads: true,
          }
        }
      }
    }
  },
  android: {
    package: 'com.geohunt.app',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'FOREGROUND_SERVICE',
      'INTERNET'
    ],
    usesCleartextTraffic: true
  },
  scheme: 'geohunt',
  updates: {
    url: 'https://u.expo.dev/c8be1773-5146-4584-af69-6317d2440191'
  },
  runtimeVersion: '1.0.0',
  plugins: [
    'expo-router',
    'expo-dev-client',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow GeoHunt to use your location.'
      }
    ]
  ],
  extra: {
    SERVER_URL: process.env.SERVER_URL || 'https://geohunt-server.fly.dev',
    eas: {
      projectId: 'c8be1773-5146-4584-af69-6317d2440191'
    }
  }
});


