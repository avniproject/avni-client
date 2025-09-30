module.exports = {
  project: {
    android: {
      sourceDir: 'android',
      appName: 'app',
      packageName: 'com.openchsclient'
    }
  },
  dependencies: {
    // PURE CustomPackageList - DISABLE ALL AUTOLINKING
    // No autolinking whatsoever - only packages in CustomPackageList will be used
    
    // Core packages - disable autolinking (manual in CustomPackageList)
    '@react-native-async-storage/async-storage': { platforms: { android: null }},
    '@react-native-clipboard/clipboard': { platforms: { android: null }},
    '@react-native-community/datetimepicker': { platforms: { android: null }},
    '@react-native-community/netinfo': { platforms: { android: null }},
    '@react-native-community/progress-bar-android': { platforms: { android: null }},
    '@react-native-cookies/cookies': { platforms: { android: null }},
    '@react-native-firebase/analytics': { platforms: { android: null }},
    '@react-native-firebase/app': { platforms: { android: null }},
    'amazon-cognito-identity-js': { platforms: { android: null }},
    'bugsnag-react-native': { platforms: { android: null }},
    'jail-monkey': { platforms: { android: null }},
    'react-native-audio-recorder-player': { platforms: { android: null }},
    'react-native-background-timer': { platforms: { android: null }},
    'react-native-background-worker': { platforms: { android: null }},
    'react-native-charts-wrapper': { platforms: { android: null }},
    'react-native-device-info': { platforms: { android: null }},
    'react-native-document-picker': { platforms: { android: null }},
    'react-native-exception-handler': { platforms: { android: null }},
    'react-native-file-viewer': { platforms: { android: null }},
    'react-native-fs': { platforms: { android: null }},
    'react-native-geolocation-service': { platforms: { android: null }},
    'react-native-get-random-values': { platforms: { android: null }},
    'react-native-i18n': { platforms: { android: null }},
    'react-native-image-picker': { platforms: { android: null }},
    'react-native-immediate-phone-call': { platforms: { android: null }},
    'react-native-keep-awake': { platforms: { android: null }},
    'react-native-keychain': { platforms: { android: null }},
    'react-native-randombytes': { platforms: { android: null }},
    'react-native-restart': { platforms: { android: null }},
    'react-native-safe-area-context': { platforms: { android: null }},
    'react-native-svg': { platforms: { android: null }},
    'react-native-vector-icons': { platforms: { android: null }},
    'react-native-video': { platforms: { android: null }},
    'react-native-webview': { platforms: { android: null }},
    'react-native-zip-archive': { platforms: { android: null }},
    'realm': { platforms: { android: null }},
    'rn-fetch-blob': { platforms: { android: null }}
    
    // RESULT: No autolinking, no PackageList generation, pure CustomPackageList control
  }
};
