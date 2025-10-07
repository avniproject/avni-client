# React Native 0.81.4 Hello World Test Plan

**Purpose**: Determine if packageName detection bug is general or project-specific  
**Time**: 30-45 minutes  
**Success Criteria**: Identify if auto-linking works in fresh RN 0.81.4 project

---

## 🎯 Test Objectives

### Questions to Answer:
1. ✅ Does React Native 0.81.4 auto-linking work out of the box?
2. ✅ Is packageName detection working in a fresh project?
3. ✅ Does React Native Gradle Plugin work without issues?
4. ✅ Are native libraries (devsupport, featureflags) built correctly?
5. ✅ Can we identify what's different from our project?

---

## 📋 Test Procedure

### Step 1: Create Fresh React Native 0.81.4 App

```bash
cd /tmp
npx react-native@0.81.4 init HelloWorldRN81 --version 0.81.4
cd HelloWorldRN81

# Verify version
cat package.json | grep '"react-native"'
# Should show: "react-native": "0.81.4"
```

---

### Step 2: Check Default Configuration

```bash
# Check if react-native.config.js exists
ls -la react-native.config.js 2>/dev/null || echo "No config file (using defaults)"

# Check android configuration
cat android/gradle.properties | grep -E "enableAutolinking|hermesEnabled"

# Check what Gradle plugin version is used
cat android/build.gradle | grep "react-native-gradle-plugin"
```

---

### Step 3: Build the App

```bash
cd android

# Clean build
./gradlew clean

# Build with verbose output to see Gradle Plugin activity
./gradlew assembleDebug --info 2>&1 | tee /tmp/rn81_helloworld_build.log

# Check if build succeeds
echo "Exit code: $?"
```

**Look for in logs**:
- ✅ `RNGP - Autolinking:` messages
- ✅ PackageName detection
- ✅ Native library building
- ❌ Any errors related to packageName

---

### Step 4: Inspect Generated Files

```bash
# Check if autolinking.json was generated
cat build/generated/autolinking/autolinking.json 2>/dev/null

# Check what native libraries are in APK
aapt list app/build/outputs/apk/debug/app-debug.apk | grep "lib/arm64-v8a.*\.so$" | sort

# Specifically check for our problem libraries
aapt list app/build/outputs/apk/debug/app-debug.apk | grep -E "devsupport|featureflag|jscexecutor|hermes"
```

---

### Step 5: Runtime Test

```bash
# Install on device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Clear logcat and start app
adb logcat -c
adb shell am start -n com.helloworldrn81/.MainActivity

# Wait and check for crashes
sleep 5
adb logcat -d | grep -E "MainActivity|ReactNative|UnsatisfiedLink|FATAL"
```

---

### Step 6: Add react-native.config.js (Like Our Project)

```bash
cd /tmp/HelloWorldRN81

# Create config file similar to our project
cat > react-native.config.js << 'EOF'
module.exports = {
  project: {
    android: {
      sourceDir: 'android',
      appName: 'app',
      packageName: 'com.helloworldrn81'
    }
  }
};
EOF

# Rebuild and check if packageName detection still works
cd android
./gradlew clean assembleDebug --info 2>&1 | grep -i "packageName"
```

---

### Step 7: Compare Gradle Files

```bash
# Compare their build.gradle with ours
diff /tmp/HelloWorldRN81/android/build.gradle \
     /Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/build.gradle

# Compare gradle.properties
diff /tmp/HelloWorldRN81/android/gradle.properties \
     /Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/gradle.properties

# Compare settings.gradle
diff /tmp/HelloWorldRN81/android/settings.gradle \
     /Users/himeshr/IdeaProjects/avni-client/packages/openchs-android/android/settings.gradle
```

---

## 📊 Expected Results & Analysis

### Scenario A: Hello World Works Perfectly ✅

**If fresh app builds and runs without issues**:

**Conclusion**: PackageName bug is **project-specific**, not RN 0.81.4 bug

**Next Steps**:
1. Compare working config with our project
2. Identify differences in:
   - `build.gradle` configuration
   - `settings.gradle` setup
   - Gradle plugin application
   - Repository configuration
3. Adapt working solution to our project
4. **Success Probability increases to 60-70%**

**Action Items**:
- Copy working Gradle configuration
- Gradually migrate CustomPackageList to auto-linking
- Test with each of our 19 packages incrementally

---

### Scenario B: Hello World Also Fails ❌

**If fresh app has same packageName detection issue**:

**Conclusion**: PackageName bug is **React Native 0.81.4 general bug**

**Next Steps**:
1. Check React Native GitHub issues for similar reports
2. Consider filing bug report
3. Explore workarounds:
   - Patch Gradle Plugin
   - Use different config format
   - Try RN 0.81.5+ if available
4. **Success Probability remains 20-30%**

**Action Items**:
- Document exact error reproduction
- Search for community solutions
- Consider staying on RN 0.72.8

---

### Scenario C: Hello World Works, Breaks with Our Config ⚠️

**If app works by default but breaks when we add react-native.config.js**:

**Conclusion**: Our config file format has issues

**Next Steps**:
1. Identify correct config format for RN 0.81.4
2. Check if config file is even needed
3. Test alternative config approaches
4. **Success Probability: 40-50%**

**Action Items**:
- Use default auto-linking (no config file)
- Selectively exclude only problematic packages
- Test with minimal config

---

## 🔍 Key Things to Check

### In Build Logs:

```bash
# Search for these patterns in build log
grep "RNGP - Autolinking" /tmp/rn81_helloworld_build.log
grep "packageName" /tmp/rn81_helloworld_build.log
grep "react-native config" /tmp/rn81_helloworld_build.log
grep "Could not find project.android.packageName" /tmp/rn81_helloworld_build.log
```

### In APK:

```bash
# Count native libraries
aapt list app/build/outputs/apk/debug/app-debug.apk | grep "\.so$" | wc -l

# Our project has: 13 libraries
# Fresh app should have: 20+ libraries (if Gradle Plugin works)

# Check specific problem libraries
aapt list app/build/outputs/apk/debug/app-debug.apk | \
  grep -E "devsupport|featureflag" || echo "MISSING: devsupport/featureflag"
```

### In Generated Files:

```bash
# Check autolinking.json structure
cat android/build/generated/autolinking/autolinking.json | jq '.'

# Our project has: {"reactNativeVersion": "0.81.4", "dependencies": {}}
# Fresh app should have: Properly populated dependencies
```

---

## 📝 Test Script (Automated)

```bash
#!/bin/bash

echo "=== React Native 0.81.4 Hello World Test ==="
echo "Starting at: $(date)"
echo ""

# Create app
cd /tmp
npx react-native@0.81.4 init HelloWorldRN81 --version 0.81.4 || exit 1
cd HelloWorldRN81

echo "✅ Created fresh React Native 0.81.4 app"
echo ""

# Build
cd android
echo "🔨 Building APK..."
./gradlew assembleDebug --info > /tmp/rn81_build.log 2>&1
BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    echo "✅ Build successful"
    
    # Check libraries
    LIB_COUNT=$(aapt list app/build/outputs/apk/debug/app-debug.apk 2>/dev/null | grep "\.so$" | wc -l)
    echo "📦 Native libraries in APK: $LIB_COUNT"
    
    # Check for problem libraries
    if aapt list app/build/outputs/apk/debug/app-debug.apk 2>/dev/null | grep -q "devsupport"; then
        echo "✅ devsupport library present"
    else
        echo "❌ devsupport library MISSING"
    fi
    
    # Check autolinking
    if grep -q "Could not find project.android.packageName" /tmp/rn81_build.log; then
        echo "❌ PackageName detection FAILED"
    else
        echo "✅ No packageName errors"
    fi
    
    # Test runtime
    if adb devices | grep -q "device$"; then
        echo "📱 Installing on device..."
        adb install -r app/build/outputs/apk/debug/app-debug.apk
        adb logcat -c
        adb shell am start -n com.helloworldrn81/.MainActivity
        sleep 5
        
        if adb logcat -d | grep -q "UnsatisfiedLinkError"; then
            echo "❌ Runtime crash with UnsatisfiedLinkError"
        else
            echo "✅ App appears to be running"
        fi
    fi
else
    echo "❌ Build failed"
    echo "Check logs at: /tmp/rn81_build.log"
fi

echo ""
echo "Completed at: $(date)"
```

---

## 🎯 Decision Tree Based on Results

```
Test Result?
    │
    ├─ Works perfectly
    │  └─> Migrate to auto-linking (60-70% success)
    │
    ├─ Fails with same error
    │  └─> Stay on RN 0.72.8 (100% success)
    │
    └─ Works until we add config
       └─> Use default auto-linking (40-50% success)
```

---

## ⏱️ Time Investment

- **Setup**: 5 minutes
- **Build & Test**: 10 minutes
- **Analysis**: 15 minutes
- **Documentation**: 10 minutes
- **Total**: 40 minutes

**vs. Blind Migration**: 1-2 weeks with 20-30% success

**ROI**: 40 minutes to know if 2 weeks of work is worth it = Excellent investment!

---

## 🚀 Quick Start Commands

```bash
# Run entire test in one go
cd /tmp && \
npx react-native@0.81.4 init HelloWorldRN81 --version 0.81.4 && \
cd HelloWorldRN81/android && \
./gradlew assembleDebug 2>&1 | tee /tmp/rn81_test.log && \
aapt list app/build/outputs/apk/debug/app-debug.apk | grep "\.so$" | wc -l && \
grep -i "packageName\|autolinking" /tmp/rn81_test.log | tail -20
```

---

**Next Step**: Run this test and report findings! This will definitively tell us if Option 2 is viable.
