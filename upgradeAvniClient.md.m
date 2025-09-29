# Input


Requirements:
- Target Android 15 (API level 35) or higher
- - Core requirement is to satisfy https://developer.android.com/about/versions/15/behavior-changes-15
- Upgrade ReactNative to 0.81.4
- Guide to upgrade is available here: https://react-native-community.github.io/upgrade-helper/?from=0.72.8&to=0.81.4&package=com.openchsclient&name=Avni
- Upgrade all dependencies to latest compatible version
- Upgrade node, npm, yarn, etc to latest versions

References:

- https://react-native-community.github.io/upgrade-helper/?from=0.72.8&to=0.81.4&package=com.openchsclient&name=Avni
- - curl 'https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.72.8..0.81.4.diff' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'Referer: https://react-native-community.github.io/' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"' \
  -H 'sec-ch-ua-mobile: ?0'

# Response  

1. **Current state**: React Native 0.72.8, targeting Android SDK 34
2. **Target state**: React Native 0.81.4, targeting Android 15 (SDK 35)
3. **Architecture**: Lerna monorepo with offline-first data collection platform using Realm, Redux, and many native dependencies

## Comprehensive React Native 0.72.8 → 0.81.4 Upgrade Plan

### Current State Analysis

**Current Configuration:**
- **React Native**: 0.72.8
- **Node**: 16 (from [.nvmrc](cci:7://file:///Users/himeshr/IdeaProjects/avni-client/.nvmrc:0:0-0:0))
- **Android compileSdk/targetSdk**: 34
- **Build Tools**: 34.0.0
- **NDK**: 23.1.7779620
- **Java**: VERSION_1_8
- **Architecture**: Lerna monorepo structure
- **Key Dependencies**: Realm 11.10.2, Native Base 3.4.9, 50+ React Native modules

**Android 15 Requirements:**
- Must target API level 35
- Enhanced security and privacy features
- New permission model changes
- Background activity restrictions

# Phase-by-Phase Upgrade Plan

## Phase 1: Pre-Upgrade Preparation (2-3 days)

### 1.1 Environment Setup
- **Upgrade Node.js**: 16 → 20 LTS (React Native 0.81.4 requirement)
- **Update yarn/npm**: Latest versions
- **Update Java**: VERSION_1_8 → VERSION_17 (Android 15 requirement)
- **Android Studio**: Update to latest version with Android 15 SDK

### 1.2 Backup and Branching
```bash
# Create upgrade branch
git checkout -b feature/rn-0.81.4-android-15-upgrade

# Create backup tags
git tag backup-pre-upgrade-$(date +%Y%m%d)
```

### 1.3 Dependency Audit
- **Critical Native Dependencies**: Realm, Firebase, Bugsnag, React Native Vector Icons
- **Test all build flavors**: generic, lfe, sakhi, gramin, lfeTeachNagaland
- **Document current functionality**: Screenshot key flows before upgrade

---

## Phase 2: Core React Native Upgrade (3-4 days)

### 2.1 React Native Core Upgrade
```bash
# Update React Native
yarn upgrade react-native@0.81.4
yarn upgrade react@18.2.0
```

### 2.2 Android Configuration Updates
**Update [android/build.gradle](cci:7://file:///Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/build.gradle:0:0-0:0):**
```gradle
buildToolsVersion = "35.0.0"
compileSdkVersion = 35  
targetSdkVersion = 35
```

**Update [android/app/build.gradle](cci:7://file:///Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/app/build.gradle:0:0-0:0):**
- Add Kotlin plugin: `apply plugin: "org.jetbrains.kotlin.android"`
- Update autolinking: `autolinkLibrariesWithApp()`
- Update JSC flavor: `io.github.react-native-community:jsc-android:2026004.+`

### 2.3 MainApplication Migration
**Convert from Java to Kotlin** (following upgrade helper):
- Migrate `MainApplication.java` → `MainApplication.kt`
- Remove Flipper integration (deprecated in 0.81.4)
- Update React Native loading mechanism

---

## Phase 3: Native Dependencies Upgrade (4-5 days)

### 3.1 Critical Dependencies Compatibility Check

**High-Risk Dependencies (Manual Testing Required):**
- `realm@11.10.2` → Latest compatible version
- `react-native-charts-wrapper@0.5.9` → Potential Android 15 compatibility issues
- `bugsnag-react-native@2.23.10` → Update for new architecture support
- `@react-native-firebase/@15.2.0` → Update for Android 15

**Medium-Risk Dependencies:**
- `react-native-device-info@10.0.2` → Android 15 permission changes
- `react-native-geolocation-service@5.3.0` → Location permission updates  
- `react-native-background-timer@2.4.1` → Background execution restrictions

### 3.2 Dependency Update Strategy
```bash
# Update React Native community packages first
yarn upgrade @react-native-async-storage/async-storage
yarn upgrade @react-native-community/netinfo
yarn upgrade @react-native-clipboard/clipboard
yarn upgrade @react-native-community/datetimepicker

# Update critical native modules
yarn upgrade react-native-device-info
yarn upgrade react-native-keychain
yarn upgrade react-native-vector-icons
```

### 3.3 New Architecture Preparation
- Enable New Architecture flags in [gradle.properties](cci:7://file:///Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/gradle.properties:0:0-0:0)
- Test Fabric renderer compatibility
- Update any custom native modules for TurboModules

---

## Phase 4: Android 15 Compliance (2-3 days)

### 4.1 Android 15 Behavioral Changes
**Target API 35 Requirements:**
- **Enhanced notification permissions**
- **Stricter background activity launches**
- **Updated file access patterns**
- **Enhanced security for sensitive permissions**

### 4.2 Permission Model Updates
**Update `AndroidManifest.xml`:**
```xml
<!-- Add new Android 15 permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Update existing permissions for Android 15 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### 4.3 Background Service Updates
- **Update background sync implementation** for Android 15 restrictions
- **Modify foreground service types** for location services
- **Update notification channels** for Android 15 requirements

---

## Phase 5: Metro and Build Configuration (1-2 days)

### 5.1 Metro Configuration Updates
**Update [metro.config.js](cci:7://file:///Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/metro.config.js:0:0-0:0):**
```javascript
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Enable for performance
      },
    }),
  },
  resolver: {
    extraNodeModules: {
      "avni-models": path.resolve(__dirname, "node_modules/openchs-models"),
    }
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### 5.2 Gradle Configuration Updates
**Update [gradle.properties](cci:7://file:///Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/gradle.properties:0:0-0:0):**
```properties
# React Native New Architecture
newArchEnabled=false  # Start with false, enable after testing

# Android 15 optimizations
android.enableR8.fullMode=true
android.useAndroidX=true
org.gradle.jvmargs=-Xmx4096M
```

---

## Phase 6: Testing and Validation (3-4 days)

### 6.1 Comprehensive Testing Matrix

**Build Testing:**
```bash
# Test all product flavors
./gradlew assembleGenericRelease
./gradlew assembleLfeRelease  
./gradlew assembleSakhiRelease
./gradlew assembleGraminRelease
./gradlew assembleLfeTeachNagalandRelease
```

**Functional Testing (Following Avni offline-first architecture):**
- **Subject registration flows**
- **Form-based data collection**  
- **Offline sync capabilities**
- **Program management features**
- **Background sync coordination** (from memory of sync improvements)
- **Identifier assignment service** (from memory of recent fixes)

### 6.2 Android 15 Specific Testing
- **Permission handling on Android 15 devices**
- **Background service functionality**
- **Notification delivery**
- **File access and storage**
- **Network connectivity edge cases**

---

## Phase 7: Production Readiness (1-2 days)

### 7.1 Performance Optimization
- **Enable R8 full mode** for release builds
- **Optimize bundle splitting** for different architectures
- **Update Proguard rules** for new dependencies
- **Test memory usage** on low-end devices

### 7.2 Release Configuration
- **Update CI/CD pipelines** for new build tools
- **Test signing configurations** for all flavors
- **Validate app bundle generation**
- **Update deployment scripts**

---

## Critical Breaking Changes & Mitigation

### 1. **Flipper Removal** (0.81.4)
- **Impact**: Debug tooling removed
- **Mitigation**: Use React DevTools, network debugging alternatives

### 2. **Android 15 Background Restrictions**
- **Impact**: Background sync may be affected
- **Mitigation**: Implement foreground services for critical sync operations

### 3. **New JSC Version**
- **Impact**: JavaScript engine changes
- **Mitigation**: Test all JavaScript-heavy operations, Realm queries

### 4. **Permission Model Changes**
- **Impact**: File access, notifications may break
- **Mitigation**: Implement runtime permission requests, fallback mechanisms

### 5. **Gradle Plugin Updates**
- **Impact**: Build configuration changes
- **Mitigation**: Follow exact upgrade helper specifications

---

## Risk Assessment & Rollback Plan

### High-Risk Areas
1. **Realm database operations** - Test extensively with large datasets
2. **Background sync service** - Critical for offline-first architecture  
3. **Multiple product flavors** - Each needs individual validation
4. **Custom native modules** - May need updates for new architecture

### Rollback Strategy
```bash
# If critical issues found:
git reset --hard backup-pre-upgrade-[date]
git push -f origin feature/rn-0.81.4-android-15-upgrade
```

### Success Criteria
- ✅ All product flavors build successfully
- ✅ Core offline functionality maintained
- ✅ Background sync works on Android 15
- ✅ Performance metrics unchanged or improved
- ✅ No regression in field worker workflows
- ✅ Passes all existing test suites

---

## Estimated Timeline: 15-20 days

**Critical Path**: Native dependencies compatibility → Android 15 compliance → Testing matrix

**Parallel Work Possible**: Documentation updates, CI/CD pipeline updates while core upgrade progresses

This plan leverages the existing Avni architecture patterns and addresses the specific challenges of an offline-first mobile data collection platform while ensuring Android 15 compliance.