/**
 * React Native 0.81.4 Configuration for Avni Client
 * Based on successful TestRN81App testing with Hermes enabled
 * 
 * Strategy: Hybrid autolinking approach
 * - React Native core: Uses autolinking 
 * - Third-party packages: Selective manual linking for better control
 */

module.exports = {
  project: {
    android: {
      sourceDir: 'android',
      appName: 'app',
      packageName: 'com.openchsclient'
    }
  },
  dependencies: {
    // PACKAGES WORKING WELL WITH AUTOLINKING (based on TestRN81App success)
    // These can use autolinking safely:
    '@react-native-async-storage/async-storage': {},
    '@react-native-clipboard/clipboard': {},
    '@react-native-community/datetimepicker': {},
    '@react-native-community/netinfo': {},
    '@react-native-firebase/app': {},
    '@react-native-firebase/analytics': {},
    'bugsnag-react-native': {},
    'react-native-device-info': {},
    '@react-native-documents/picker': {},
    'react-native-fs': {},
    'react-native-geolocation-service': {},
    'react-native-image-picker': {},
    'react-native-keep-awake': {},
    'react-native-keychain': {},
    'react-native-safe-area-context': {},
    'react-native-svg': {},
    'react-native-vector-icons': {},
    'react-native-webview': {},
    
    // REALM - Enable autolinking (working fine with NDK 27)
    'realm': {},
    
    // PACKAGES THAT MAY NEED MANUAL LINKING (if issues arise)
    // Uncomment and set to null if autolinking causes problems:
    
    // 'react-native-restart': {
    //   platforms: {
    //     android: null,
    //   },
    // },
    
    // 'rn-fetch-blob': {
    //   platforms: {
    //     android: null,
    //   },
    // },
  },
};
