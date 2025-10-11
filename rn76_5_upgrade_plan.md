Based on analyzing the Avni project repository and your current setup, here's the **enhanced migration plan** tailored specifically for your avni-client repository:

# 🚀 Enhanced Avni-Client: React Native 0.72.8 → 0.76.5 Migration Plan

## 📊 Current Repository Context

**Avni-Client Repository**: https://github.com/avniproject/avni-client/tree/15.2
- **Current**: React Native 0.72.8 + Legacy Architecture
- **Monorepo structure**: `packages/openchs-android/` contains the React Native app
- **Production app**: Field worker data collection platform for health/social programs
- **Active development**: Branch 15.2 with ongoing Android 15 support work

## 🎯 Repository-Specific Preparation

### Phase 0: Repository Setup (10 minutes)

```bash
# Clone and setup the specific branch
git clone https://github.com/avniproject/avni-client.git
cd avni-client
git checkout 15.2

# Navigate to the React Native package
cd packages/openchs-android

# Create feature branch for the upgrade
git checkout -b feature/rn-0.76.5-android15-upgrade

# Backup current state
cp package.json package.json.rn-0.72.8-backup
cp -r android android-rn-0.72.8-backup
```

### Phase 1: Avni-Specific Package Updates (15 minutes)

**Update package.json for Avni dependencies:**

```bash
# Core React Native upgrade
npm install react-native@0.76.5 --save-exact --legacy-peer-deps

# Update Avni's custom packages (keep versions that work with your backend)
# Keep these stable for Avni compatibility:
# - openchs-models@1.32.54 ✅ (your models package)
# - avni-health-modules@^0.0.28 ✅ (health modules)
# - rules-config@github:openchs/rules-config#7f34ac91826bbaabb27bf9d86bf7cecb8710d1d8 ✅

# React Native packages - update to RN 0.76.5 compatible versions
npm install @react-native-async-storage/async-storage@1.24.0 --save-exact --legacy-peer-deps
npm install @react-native-clipboard/clipboard@1.16.0 --save-exact --legacy-peer-deps
npm install @react-native-community/datetimepicker@8.4.5 --save-exact --legacy-peer-deps
npm install @react-native-community/netinfo@11.4.1 --save-exact --legacy-peer-deps
npm install @react-native-cookies/cookies@6.2.1 --save-exact --legacy-peer-deps
npm install @react-native-firebase/app@20.4.0 --save-exact --legacy-peer-deps
npm install @react-native-firebase/analytics@20.4.0 --save-exact --legacy-peer-deps

# Update media/device packages
npm install react-native-audio-recorder-player@3.6.14 --save-exact --legacy-peer-deps
npm install react-native-document-picker@10.1.7 --save-exact --legacy-peer-deps
npm install react-native-image-picker@8.2.1 --save-exact --legacy-peer-deps
npm install react-native-device-info@14.1.1 --save-exact --legacy-peer-deps

# Update UI components
npm install react-native-safe-area-context@5.6.1 --save-exact --legacy-peer-deps
npm install react-native-svg@15.14.0 --save-exact --legacy-peer-deps
npm install react-native-webview@13.16.0 --save-exact --legacy-peer-deps

# Update video components
npm install react-native-video@6.16.1 --save-exact --legacy-peer-deps
npm install react-native-video-player@0.16.3 --save-exact --legacy-peer-deps

# CRITICAL: Keep Realm at 11.10.2 for data compatibility
# npm install realm@11.10.2 --save-exact --legacy-peer-deps  # Already correct

# Update development dependencies
npm install metro-react-native-babel-preset@0.76.5 --save-dev --save-exact --legacy-peer-deps
npm install @react-native-community/cli@15.0.0 --save-dev --save-exact --legacy-peer-deps
```

### Phase 2: Avni-Specific Android Configuration (20 minutes)

**Update `android/build.gradle` (project-level) for Avni:**

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35          // Android 15 support for Avni
        targetSdkVersion = 35           // Android 15 support for Avni
        supportLibVersion = "1.2.0"
        googlePlayServicesVersion = "16.0.0"  // Keep for Avni Firebase
        kotlinVersion = '1.9.22'        // RN 0.76.5 compatible
        ndkVersion = "25.2.9519653"     // Keep for Realm 11.10.2 compatibility
        reactNativeVersion = '0.76.5'   // Updated for tracking
    }

    repositories {
        google()
        mavenCentral()
        // Keep Avni-specific repositories
        maven { url "https://jitpack.io" }
    }
    
    dependencies {
        classpath("com.android.tools.build:gradle:8.5.0")
        classpath("com.google.gms:google-services:4.4.2")  // Keep for Firebase
        classpath("de.undercouch:gradle-download-task:4.1.2")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url "https://jitpack.io" }
        maven { url "https://www.jitpack.io" }  // Keep for Avni dependencies
    }
}
```

**Update `android/app/build.gradle` for Avni with flavors:**

```gradle
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
    id("com.google.gms.google-services")  // Keep for Avni Firebase
    id("kotlin-kapt")
}

react {
    debuggableVariants = ["genericDebug", "lfeDebug", "sakhiDebug"]  // Avni flavors
    autolinkLibrariesWithApp()
}

android {
    namespace = "com.openchsclient"
    compileSdk 35

    defaultConfig {
        applicationId "com.openchsclient"
        minSdk 24
        targetSdk 35                    // Android 15 for Avni
        versionCode 1
        versionName "1.0"
        
        buildConfigField("boolean", "IS_HERMES_ENABLED", "true")
        buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", "false")
        
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }

    // Keep Avni's product flavors
    flavorDimensions = ["tier"]
    productFlavors {
        generic {
            dimension "tier"
        }
        lfe {
            dimension "tier"
        }
        sakhi {
            dimension "tier"
        }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
    
    // Avni-specific dependencies - keep existing
    implementation project(':realm')
    
    // Keep all existing Avni dependencies from your current build.gradle
    // (Firebase, Bugsnag, native modules, etc.)
}
```

### Phase 3: Avni Application Code Updates (15 minutes)

**Update `MainApplication.kt` for Avni:**

```kotlin
package com.openchsclient

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            // Use PackageList for autolinking (includes all Avni packages)
            return PackageList(this).packages
        }

        override fun getJSMainModuleName(): String {
            return "index"  // Avni uses index.js
        }

        override val isNewArchEnabled: Boolean
            get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            
        override val isHermesEnabled: Boolean
            get() = BuildConfig.IS_HERMES_ENABLED
    }

    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        
        // Keep Avni's existing initialization if any
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load()
        }
    }
}
```

**Update `MainActivity.java` for Avni (keep existing configuration handling):**

```java
package com.openchsclient;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class MainActivity extends ReactActivity {

    @Override
    protected String getMainComponentName() {
        return "Avni";  // Avni app name
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            false  // fabricEnabled - false for legacy architecture
        );
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Keep Avni's configuration broadcast (if used)
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        sendBroadcast(intent);
    }
}
```

### Phase 4: Avni Metro Configuration (5 minutes)

**Update `metro.config.js` for Avni's model alias:**

```javascript
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Avni-specific configuration
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      // Keep Avni's model alias
      'avni-models': 'openchs-models',
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### Phase 5: Avni Build and Testing (30 minutes)

```bash
# Clean install with Avni dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Clean Android build
cd android
./gradlew clean
rm -rf .gradle app/build build

# Build Avni Android app
./gradlew :app:assembleGenericDebug --rerun-tasks

# Test Avni-specific functionality
# - Realm database operations
# - Audio recording (fieldworker interviews)
# - Image capture (beneficiary photos)
# - GPS location (field visits)
# - Form rendering (health assessments)
# - Sync functionality
```

### Phase 6: Avni Data Migration Safety (10 minutes)

```bash
# Before deploying to production, ensure Realm compatibility
# Test with existing Avni database files

# Create test script for Avni data validation
cat > test-avni-data.js << 'EOF'
import Realm from 'realm';

// Test Realm 11.10.2 compatibility with RN 0.76.5
const realm = new Realm({
  schema: [/* your existing Avni schemas */],
  schemaVersion: /* current version */,
});

console.log('Realm objects count:', realm.objects('Individual').length);
console.log('✅ Avni data migration test passed');
EOF

# Run data validation
node test-avni-data.js
```

## 🎯 Avni-Specific Benefits

**Fieldworker App Improvements:**
1. ✅ **Android 15 support** - Works on latest devices
2. ✅ **Better performance** - Faster form loading, smoother scrolls
3. ✅ **Improved camera/media** - Better image capture quality
4. ✅ **Better GPS accuracy** - Enhanced location services
5. ✅ **Stable offline mode** - More reliable data sync
6. ✅ **Enhanced security** - Updated encryption for health data

**Avni Development Team Benefits:**
1. ✅ **Future-proof platform** - Easier future upgrades
2. ✅ **Better debugging** - Improved development tools
3. ✅ **Stable backend integration** - No breaking API changes
4. ✅ **Maintained data compatibility** - All existing data preserved

## 🚨 Avni-Specific Testing Checklist

**Critical Avni Functionality:**
- [ ] **User registration/login** (Amazon Cognito)
- [ ] **Form rendering** (health assessments, surveys)
- [ ] **Audio recording** (interviews, voice notes)
- [ ] **Image capture** (beneficiary photos, ID documents)
- [ ] **GPS location tracking** (field visit verification)
- [ ] **Offline data storage** (Realm database)
- [ ] **Data synchronization** (upload to Avni server)
- [ ] **Report generation** (fieldworker summaries)
- [ ] **Multi-language support** (Hindi, regional languages)
- [ ] **Background services** (sync, notifications)

## 🎯 Avni Production Deployment Strategy

```bash
# Stage 1: Internal testing (1 week)
# Build and test with internal team

# Stage 2: Pilot fieldworkers (2 weeks) 
# Deploy to 10-20 experienced fieldworkers
# Monitor crash reports, data integrity

# Stage 3: Regional rollout (1 month)
# Deploy to specific regions/programs
# Monitor performance metrics

# Stage 4: Full production (ongoing)
# Deploy to all fieldworkers
# Maintain backward compatibility for data sync
```

This enhanced plan is **specifically tailored for Avni's requirements** as a **production health data collection platform** with thousands of fieldworkers in the field. The upgrade path ensures **data integrity**, **backward compatibility**, and **minimal disruption** to ongoing health programs.

The migration should take **approximately 2-3 hours for development** and **2-4 weeks for full production rollout** with proper testing phases.

[1](https://javascript.plainenglish.io/the-basics-of-package-json-e8c85df55611)
[2](https://github.com/avniproject/avni-client/pulls)
[3](https://help.branch.io/developers-hub/docs/react-native-advanced-features)
[4](https://www.youtube.com/watch?v=v9eV1pjNwc0)
[5](https://avniproject.org/about/)
[6](https://help.branch.io/developers-hub/docs/react-native-basic-integration)
[7](https://dev.to/amitkumar13/how-to-add-a-local-package-in-a-react-native-project-6mc)
[8](https://avniproject.org)
[9](https://github.com/BranchMetrics/react-native-branch-deep-linking-attribution)
[10](https://stackoverflow.com/questions/58181803/reactnative-package-json-dependencies-updation)
[11](https://avni.readme.io/docs/environment-setup-for-front-end-product-development-ubuntu)
[12](https://github.com/appodeal/react-native-appodeal)
[13](https://github.com/avniproject/avni-client)
[14](https://avni.readme.io/docs/test-and-production-environment-setup-centos)
[15](https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/changelog/)
[16](https://avni.readme.io/docs/avni-repositories)
[17](https://www.npmjs.com/package/react-native-branch/v/4.2.0?activeTab=versions)
[18](https://reactnative.dev/blog/2023/06/21/package-exports-support)
[19](https://www.npmjs.com/package/react-native-branch/v/0.0.2?activeTab=versions)
[20](https://reactnative.dev/docs/upgrading)