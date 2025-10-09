# React Native 0.81.4 Upgrade - Complete Solutions Guide

**Duration**: 10+ days of troubleshooting and resolution  
**Target**: Avni Client (offline-first mobile data collection platform)  
**Upgrade Path**: React Native 0.66.x → 0.81.4 + Android 15 (SDK 35)

---

## Table of Contents
1. [Decorator Syntax Issues](#1-decorator-syntax-issues)
2. [Metro Bundler Configuration](#2-metro-bundler-configuration)
3. [Babel Configuration](#3-babel-configuration)
4. [Hermes Engine Compatibility](#4-hermes-engine-compatibility)
5. [Android Gradle 8 Migration](#5-android-gradle-8-migration)
6. [Package Compatibility](#6-package-compatibility)
7. [Autolinking Issues](#7-autolinking-issues)
8. [Native Module Issues](#8-native-module-issues)
9. [Build System Fixes](#9-build-system-fixes)
10. [Debugging Techniques](#10-debugging-techniques-that-worked)

---

## 1. Decorator Syntax Issues

### Problem
Hermes parser in React Native 0.81.4 doesn't recognize decorator syntax (`@Action`, `@computed`, etc.) causing:
```
SyntaxError: unrecognized character '@' in BeneficiaryIdentificationActions.js
```

### Root Cause
- `babel-plugin-syntax-hermes-parser` was overriding standard Babel parser
- Decorators need to be transformed BEFORE Hermes parsing
- Metro bundler wasn't applying Babel transforms correctly

### **CRITICAL SOLUTION: Metro API Introspection**
The breakthrough came from **calling Metro APIs directly** to inspect what code was being generated at specific locations:

```javascript
// Technique: Use Metro's transform API to see actual code
const Metro = require('metro');
const config = await Metro.loadConfig();
const result = await Metro.transformFile(
  config,
  '/path/to/file.js',
  { /* options */ }
);
console.log(result.code); // See actual transformed code
```

This revealed that:
1. Decorators weren't being transformed at all
2. Babel plugins were being skipped for certain files
3. The transform order was incorrect

### Solution Applied
**babel.config.js**:
```javascript
module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    // CRITICAL: Decorators MUST be first
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-object-rest-spread'],
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
```

**metro.config.js**:
```javascript
const { getDefaultConfig } = require('@react-native/metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  
  return {
    ...defaultConfig,
    transformer: {
      ...defaultConfig.transformer,
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      // Ensure all JS files go through Babel
      enableBabelRCLookup: true,
      enableBabelRuntime: true,
    },
  };
})();
```

### Key Learnings
- **Always verify transformed code** using Metro APIs, don't trust configuration alone
- Decorator plugin order matters critically
- Hermes parser runs AFTER Babel transforms
- Use `metro-react-native-babel-transformer` explicitly

---

## 2. Metro Bundler Configuration

### Problem
Node.js modules (like `bindings`, `crypto`) failing with:
```
Error: Unable to resolve module bindings
```

### Solution: Polyfills + Metro Resolver
**metro.config.js**:
```javascript
const path = require('path');

module.exports = {
  resolver: {
    extraNodeModules: {
      // Polyfill Node.js modules
      'bindings': path.resolve(__dirname, 'polyfills/bindings.js'),
      'crypto': path.resolve(__dirname, 'polyfills/crypto.js'),
    },
    // Ensure proper module resolution
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
};
```

**polyfills/bindings.js**:
```javascript
// Polyfill for native bindings module
module.exports = function bindings(name) {
  return require('react-native').NativeModules[name];
};
```

**polyfills/crypto.js**:
```javascript
// Polyfill for crypto using react-native-get-random-values
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export default require('crypto-browserify');
```

---

## 3. Babel Configuration

### Problem
Babel preset changed from `metro-react-native-babel-preset` to `@react-native/babel-preset`

### Solution
```json
{
  "devDependencies": {
    "@react-native/babel-preset": "0.81.4"
  }
}
```

Remove old preset:
```bash
npm uninstall metro-react-native-babel-preset
```

---

## 4. Hermes Engine Compatibility

### Testing Methodology
Created isolated test app to verify Hermes `require()` patterns:

**Test Results**:
- ✅ Static require: `require('module-name')`
- ✅ Variable require: `require(moduleName)`
- ✅ Conditional require: `if (condition) require('module')`
- ✅ Template literal: `require(\`${prefix}-${suffix}\`)`
- ❌ Computed property: `require(moduleMap[key])` - **FAILS**

### Solution for Dynamic Requires
Replace computed property access:
```javascript
// BEFORE (fails with Hermes)
const module = require(moduleMap[propertyName]);

// AFTER (works with Hermes)
const moduleName = moduleMap[propertyName];
const module = require(moduleName);
```

### Hermes Configuration
**android/gradle.properties**:
```properties
hermesEnabled=true
```

**android/app/build.gradle**:
```gradle
dependencies {
    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android:$rootProject.ext.reactNativeVersion")
    } else {
        implementation('org.webkit:android-jsc:+')
    }
}
```

---

## 5. Android Gradle 8 Migration

### Major Changes Required

#### 5.1 Namespace Declaration
All Android libraries need namespace in `build.gradle`:

**BEFORE**:
```gradle
android {
    compileSdkVersion 28
}
```

**AFTER**:
```gradle
android {
    namespace 'com.openchsclient'
    compileSdkVersion 35
}
```

#### 5.2 AndroidManifest.xml
Remove package attribute:
```xml
<!-- BEFORE -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.openchsclient">

<!-- AFTER -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
```

#### 5.3 Packaging Options
Handle duplicate META-INF files:
```gradle
android {
    packagingOptions {
        // Native libraries
        pickFirst '**/libhermes.so'
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
        
        // Fix duplicate META-INF from OkHttp3
        exclude 'META-INF/versions/9/OSGI-INF/MANIFEST.MF'
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/NOTICE'
    }
}
```

#### 5.4 Gradle Wrapper Update
```properties
# gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-all.zip
```

#### 5.5 Android Gradle Plugin
```gradle
// android/build.gradle
buildscript {
    dependencies {
        classpath("com.android.tools.build:gradle:8.7.3")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.10")
    }
}
```

---

## 6. Package Compatibility

### 6.1 Patch File Management

**Strategy**: Organize patches by applicability
- **Active patches** (`*.patch`): For current package versions
- **Disabled patches** (`*.patch.disabled`): For upgraded packages
- **Backup patches** (`patches_backup/`): Historical reference

**Verification Script**:
```javascript
// Check if patches match current versions
const pkg = require('./package.json');
const fs = require('fs');

const patches = fs.readdirSync('./patches');
patches.forEach(patch => {
  const match = patch.match(/^(.+?)\+(\d+\.\d+\.\d+.*?)\.patch$/);
  if (match) {
    const [_, pkgName, version] = match;
    const normalizedName = pkgName.replace(/\+/g, '/');
    const currentVersion = pkg.dependencies[normalizedName];
    
    if (currentVersion && currentVersion.replace(/[\^~]/, '') === version) {
      console.log(`✅ MATCH: ${normalizedName}@${version}`);
    } else {
      console.log(`❌ MISMATCH: ${normalizedName}: ${version} → ${currentVersion}`);
    }
  }
});
```

### 6.2 Critical Patches Restored

**Packages needing namespace fixes** (exact version matches):
1. `react-native-fs@2.20.0` - Namespace + AndroidManifest
2. `react-native-background-timer@2.4.1` - Namespace
3. `react-native-background-worker@0.0.5` - Namespace + maven-publish
4. `react-native-exception-handler@2.10.10` - Namespace
5. `react-native-file-viewer@2.1.5` - Namespace
6. `react-native-keep-awake@4.0.0` - Namespace
7. `react-native-immediate-phone-call@2.0.0` - Namespace
8. `@react-native-community/progress-bar-android@1.0.5` - Namespace
9. `@react-native-cookies/cookies@6.2.1` - Namespace

### 6.3 Package Version Alignment

**React 19 Compatibility**:
```json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "0.81.4"
  },
  "devDependencies": {
    "react-dom": "19.1.0",
    "react-test-renderer": "19.1.0"
  }
}
```

**Critical**: All React packages must be **exact same version** to avoid:
```
Error: Incompatible React versions: react (19.1.1) vs react-native-renderer (19.1.0)
```

---

## 7. Autolinking Issues

### Problem
React Native Gradle Plugin autolinking failing:
```
RNGP - Autolinking: Could not find project.android.packageName in react-native config output!
```

### Solution: react-native.config.js
```javascript
module.exports = {
  project: {
    android: {
      packageName: 'com.openchsclient',
    },
  },
  dependencies: {
    // Explicitly configure packages if needed
  },
};
```

### Gradle Integration
```gradle
// android/app/build.gradle
react {
    autolinkLibrariesWithApp()
}
```

---

## 8. Native Module Issues

### 8.1 AsyncStorage Room Annotation Processor

**Problem**:
```
Cannot find implementation for com.reactnativecommunity.asyncstorage.next.StorageDb. 
StorageDb_Impl does not exist. Is Room annotation processor correctly configured?
```

**Root Cause**: `@react-native-async-storage/async-storage@2.2.0` uses AndroidX Room database which requires annotation processing at build time.

**Solution**:
```gradle
// android/app/build.gradle
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
    id("kotlin-kapt")  // ← CRITICAL: Enable Kotlin annotation processing
}

dependencies {
    // Room dependencies
    def room_version = "2.6.1"
    kapt "androidx.room:room-compiler:$room_version"
    implementation "androidx.room:room-runtime:$room_version"
    implementation "androidx.room:room-ktx:$room_version"
}
```

**Build Process**:
```bash
# Clean build to trigger kapt
./gradlew clean
./gradlew assembleGenericDebug
# kapt generates StorageDb_Impl during build
```

### 8.2 MainApplication Migration to Kotlin

**BEFORE (Java)**:
```java
public class MainApplication extends Application implements ReactApplication {
    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }
        
        @Override
        protected List<ReactPackage> getPackages() {
            return new PackageList(this).getPackages();
        }
    };
}
```

**AFTER (Kotlin)**:
```kotlin
class MainApplication : Application(), ReactApplication {
    override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> = 
            PackageList(this).packages.apply {
                // Add custom packages if needed
            }
        
        override fun getJSMainModuleName(): String = "index"
        
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
        
        override fun getBundleAssetName(): String = "index.android.bundle"
    }
    
    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
    }
}
```

---

## 9. Build System Fixes

### 9.1 JVM Target Compatibility
```gradle
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = '17'
    }
}
```

### 9.2 SDK Versions
```gradle
// android/build.gradle
ext {
    buildToolsVersion = "35.0.0"
    minSdkVersion = 24
    compileSdkVersion = 35
    targetSdkVersion = 35
    ndkVersion = "27.0.12077973"
    kotlinVersion = "1.9.10"
    supportLibVersion = "1.6.1"
}
```

### 9.3 Gradle Properties
```properties
# android/gradle.properties
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
hermesEnabled=true
newArchEnabled=false
```

---

## 10. Debugging Techniques That Worked

### 10.1 Metro API Introspection (BREAKTHROUGH)
**The most critical technique** that solved the decorator issue:

```javascript
// Create debug script: debug-metro.js
const Metro = require('metro');
const path = require('path');

async function inspectTransform(filePath) {
    const config = await Metro.loadConfig({
        cwd: __dirname,
    });
    
    const result = await Metro.transformFile(
        config,
        path.resolve(__dirname, filePath),
        {
            dev: true,
            hot: false,
            minify: false,
            platform: 'android',
            type: 'module',
        }
    );
    
    console.log('=== TRANSFORMED CODE ===');
    console.log(result.code);
    console.log('\n=== SOURCE MAP ===');
    console.log(result.map);
}

// Usage
inspectTransform('src/action/beneficiaryMode/BeneficiaryIdentificationActions.js');
```

**Run**:
```bash
node debug-metro.js
```

This revealed:
- Whether decorators were being transformed
- Exact code Hermes was receiving
- Transform pipeline issues
- Plugin ordering problems

### 10.2 Gradle Build Analysis
```bash
# Detailed build output
./gradlew assembleGenericDebug --info --stacktrace

# Dependency tree
./gradlew :app:dependencies

# Task execution order
./gradlew assembleGenericDebug --dry-run

# Check generated files
find android/app/build/generated -name "*.java" | grep StorageDb
```

### 10.3 APK Inspection
```bash
# List contents of APK
unzip -l android/app/build/outputs/apk/generic/debug/app-generic-arm64-v8a-debug.apk

# Check for specific .so files
unzip -l app.apk | grep "\.so$"

# Extract and inspect
unzip app.apk -d /tmp/apk-contents
ls -lh /tmp/apk-contents/lib/arm64-v8a/
```

### 10.4 ADB Logcat Filtering
```bash
# React Native specific logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# Specific error patterns
adb logcat | grep -E "(ERROR|FATAL|Exception)"

# AsyncStorage specific
adb logcat | grep -i "asyncstorage\|room\|storagedb"
```

### 10.5 Package Version Verification
```bash
# Check installed versions
npm list react react-dom react-native

# Check for duplicate packages
npm ls react --depth=0

# Verify peer dependencies
npm ls --depth=0 2>&1 | grep "UNMET PEER DEPENDENCY"
```

### 10.6 Metro Bundler Debugging
```bash
# Start Metro with verbose logging
npx react-native start --verbose

# Reset Metro cache
npx react-native start --reset-cache

# Check Metro config
npx react-native config
```

### 10.7 Hermes Bytecode Inspection
```bash
# Compile to Hermes bytecode
node_modules/react-native/sdks/hermesc/osx-bin/hermesc \
  -emit-binary \
  -out output.hbc \
  input.js

# Disassemble bytecode
node_modules/react-native/sdks/hermesc/osx-bin/hbcdump output.hbc
```

---

## 11. Complete Build & Run Workflow

### Clean Build Process
```bash
# 1. Clean everything
cd packages/openchs-android
rm -rf node_modules package-lock.json
cd android
./gradlew clean
rm -rf .gradle build
cd app
rm -rf build
cd ../../..

# 2. Install dependencies
cd packages/openchs-android
npm install --legacy-peer-deps

# 3. Apply patches
npx patch-package

# 4. Clean Metro cache
watchman watch-del-all
rm -rf /tmp/metro-* /tmp/haste-* /tmp/react-*

# 5. Build Android
cd android
./gradlew assembleGenericDebug --info

# 6. Install and run
cd ..
npx react-native run-android --variant=genericDebug
```

### Incremental Build
```bash
# After code changes
cd packages/openchs-android
npx react-native start --reset-cache

# In another terminal
cd packages/openchs-android
npx react-native run-android --variant=genericDebug
```

---

## 12. Key Lessons Learned

### 12.1 Always Verify Transformed Code
- **Don't trust configuration alone** - use Metro APIs to inspect actual output
- Babel plugins can silently fail or be skipped
- Transform order matters critically

### 12.2 Annotation Processing Timing
- kapt runs during Gradle build, not npm install
- Clean builds are necessary to regenerate annotation-processed classes
- Check `build/generated/` for expected files

### 12.3 Version Alignment is Critical
- React ecosystem requires **exact version matches**
- Use `npm list` to verify no duplicates
- Lock files can be stale - regenerate when changing versions

### 12.4 Patch Management Strategy
- Organize patches by applicability (active/disabled/backup)
- Verify patches match current package versions
- Recreate patches when packages are upgraded

### 12.5 Gradle 8 Breaking Changes
- Namespace declaration is mandatory
- AndroidManifest package attribute removed
- Packaging options syntax changed
- Maven plugin replaced with maven-publish

### 12.6 Debugging Workflow
1. **Isolate the problem** - create minimal reproduction
2. **Inspect transformed code** - use Metro APIs
3. **Verify build artifacts** - check generated files
4. **Test incrementally** - one change at a time
5. **Document solutions** - for future reference

---

## 13. Common Pitfalls to Avoid

### ❌ Don't Do This
1. **Skipping clean builds** after Gradle changes
2. **Assuming Babel config works** without verification
3. **Ignoring peer dependency warnings**
4. **Using stale package-lock.json** after version changes
5. **Applying patches without version verification**
6. **Mixing Java and Kotlin without proper configuration**
7. **Forgetting to enable kapt** for annotation processing

### ✅ Do This Instead
1. **Always clean build** after native changes
2. **Verify transforms** with Metro APIs
3. **Resolve peer dependencies** properly
4. **Regenerate lock files** after version changes
5. **Verify patch applicability** before applying
6. **Use Kotlin consistently** for new code
7. **Enable kapt plugin** for Room/Dagger/etc.

---

## 14. Testing Checklist

### Build Verification
- [ ] `./gradlew clean` succeeds
- [ ] `./gradlew assembleGenericDebug` succeeds
- [ ] APK contains all required .so files
- [ ] Generated Room classes exist in build/generated/
- [ ] No duplicate META-INF files in APK

### Runtime Verification
- [ ] App installs successfully
- [ ] App launches without crashes
- [ ] AsyncStorage works (no StorageDb_Impl error)
- [ ] Decorators work (no syntax errors)
- [ ] Hermes is enabled (check logs)
- [ ] All native modules load correctly

### Code Verification
- [ ] Metro bundles without errors
- [ ] Babel transforms decorators
- [ ] No require() errors with Hermes
- [ ] Polyfills work for Node.js modules

---

## 15. Reference Configuration Files

### package.json (key sections)
```json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "0.81.4",
    "@react-native-async-storage/async-storage": "^2.2.0"
  },
  "devDependencies": {
    "@react-native/babel-preset": "0.81.4",
    "@react-native/metro-config": "^0.81.1",
    "react-dom": "19.1.0",
    "react-test-renderer": "19.1.0"
  },
  "scripts": {
    "postinstall": "npx patch-package"
  }
}
```

### babel.config.js
```javascript
module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-object-rest-spread'],
  ],
};
```

### metro.config.js
```javascript
const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  
  return {
    ...defaultConfig,
    resolver: {
      ...defaultConfig.resolver,
      extraNodeModules: {
        'bindings': path.resolve(__dirname, 'polyfills/bindings.js'),
        'crypto': path.resolve(__dirname, 'polyfills/crypto.js'),
      },
    },
    transformer: {
      ...defaultConfig.transformer,
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
    },
  };
})();
```

### android/app/build.gradle (key sections)
```gradle
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
    id("kotlin-kapt")
}

android {
    namespace 'com.openchsclient'
    compileSdkVersion 35
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = '17'
    }
    
    packagingOptions {
        pickFirst '**/libhermes.so'
        exclude 'META-INF/versions/9/OSGI-INF/MANIFEST.MF'
    }
}

react {
    autolinkLibrariesWithApp()
}

dependencies {
    implementation("com.facebook.react:react-android:$rootProject.ext.reactNativeVersion")
    implementation("com.facebook.react:hermes-android:$rootProject.ext.reactNativeVersion")
    
    def room_version = "2.6.1"
    kapt "androidx.room:room-compiler:$room_version"
    implementation "androidx.room:room-runtime:$room_version"
}
```

---

## 16. Success Metrics

### Build System
- ✅ Gradle 8.14.3 working
- ✅ Android SDK 35 (Android 15) support
- ✅ Kotlin 1.9.10 integration
- ✅ All 18/19 packages building

### Runtime
- ✅ Hermes enabled and working
- ✅ Decorators transforming correctly
- ✅ AsyncStorage with Room database
- ✅ All native modules loading
- ✅ Offline-first architecture preserved

### Code Quality
- ✅ No decorator syntax errors
- ✅ No require() compatibility issues
- ✅ Proper error handling maintained
- ✅ Building block architecture intact

---

## Conclusion

The React Native 0.81.4 upgrade required addressing multiple interconnected issues across the build system, bundler configuration, and native modules. The **breakthrough technique** was using **Metro's transform APIs to inspect actual code generation**, which revealed that decorators weren't being transformed despite correct Babel configuration.

Key success factors:
1. **Systematic debugging** - Metro API introspection
2. **Clean builds** - Ensuring annotation processors run
3. **Version alignment** - Exact React version matching
4. **Patch management** - Organized by applicability
5. **Documentation** - Recording solutions for future reference

This upgrade maintains Avni's offline-first architecture while modernizing to React Native 0.81.4, Android 15, and Hermes engine.
