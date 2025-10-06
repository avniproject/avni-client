module.exports = {
  dependencies: {
    // HYBRID LINKING STRATEGY:
    // - React Native core: Uses autolinking (builds native libraries like libreact_devsupportjni.so)  
    // - Third-party packages: Disabled autolinking, use CustomPackageList for manual control
    
    // Disable autolinking for packages we manually link via CustomPackageList
    '@react-native-async-storage/async-storage': {
      platforms: {
        android: null,
      },
    },
    '@react-native-clipboard/clipboard': {
      platforms: {
        android: null,
      },
    },
    '@react-native-community/datetimepicker': {
      platforms: {
        android: null,
      },
    },
    '@react-native-community/netinfo': {
      platforms: {
        android: null,
      },
    },
    '@react-native-firebase/analytics': {
      platforms: {
        android: null,
      },
    },
    '@react-native-firebase/app': {
      platforms: {
        android: null,
      },
    },
    'bugsnag-react-native': {
      platforms: {
        android: null,
      },
    },
    'react-native-device-info': {
      platforms: {
        android: null,
      },
    },
    '@react-native-documents/picker': {
      platforms: {
        android: null,
      },
    },
    'react-native-fs': {
      platforms: {
        android: null,
      },
    },
    'react-native-geolocation-service': {
      platforms: {
        android: null,
      },
    },
    'react-native-image-picker': {
      platforms: {
        android: null,
      },
    },
    'react-native-keep-awake': {
      platforms: {
        android: null,
      },
    },
    'react-native-keychain': {
      platforms: {
        android: null,
      },
    },
    'react-native-safe-area-context': {
      platforms: {
        android: null,
      },
    },
    'react-native-svg': {
      platforms: {
        android: null,
      },
    },
    'react-native-vector-icons': {
      platforms: {
        android: null,
      },
    },
    'react-native-webview': {
      platforms: {
        android: null,
      },
    },
    'realm': {
      platforms: {
        android: null,
      },
    },
  },
  project: {
    android: {
      sourceDir: 'android',
      appName: 'app',
      packageName: 'com.openchsclient'
    }
  }
};
