module.exports = {
  project: {
    android: {
      sourceDir: 'android',
      appName: 'app',
      packageName: 'com.openchsclient'
    }
  },
  dependencies: {
    // Hybrid approach: Enable Android modules for CustomPackageList packages, disable problematic ones
    // Android modules are included in Gradle build, but CustomPackageList controls package registration
    
    // ✅ ENABLED - Packages in CustomPackageList (Android modules needed for compilation)
    // These are auto-included in Gradle but CustomPackageList controls the actual package list
    
    // ❌ DISABLED - Packages NOT in CustomPackageList (exclude from build)
    '@react-native-community/progress-bar-android': { platforms: { android: null }},
    '@react-native-cookies/cookies': { platforms: { android: null }},
    'amazon-cognito-identity-js': { platforms: { android: null }},
    'jail-monkey': { platforms: { android: null }},
    'react-native-audio-recorder-player': { platforms: { android: null }},
    'react-native-background-timer': { platforms: { android: null }},
    'react-native-background-worker': { platforms: { android: null }},
    'react-native-charts-wrapper': { platforms: { android: null }},
    'react-native-exception-handler': { platforms: { android: null }},
    'react-native-file-viewer': { platforms: { android: null }},
    'react-native-get-random-values': { platforms: { android: null }},
    'react-native-i18n': { platforms: { android: null }},
    'react-native-immediate-phone-call': { platforms: { android: null }},
    'react-native-randombytes': { platforms: { android: null }},
    'react-native-restart': { platforms: { android: null }},
    'react-native-video': { platforms: { android: null }},
    'react-native-zip-archive': { platforms: { android: null }},
    'rn-fetch-blob': { platforms: { android: null }}
    
    // RESULT: 19 packages enabled for Gradle (Android modules compile), CustomPackageList controls registration
  }
};
