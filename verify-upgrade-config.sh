#!/bin/bash
# React Native 0.81.4 Upgrade Verification Script
# Verifies all critical configuration files are in place

echo "🔍 React Native 0.81.4 Upgrade Configuration Verification"
echo "==========================================================="

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    local file=$1
    local critical=$2
    if [ -f "$file" ]; then
        echo "✅ $file - EXISTS"
    else
        if [ "$critical" = "CRITICAL" ]; then
            echo "🚨 $file - MISSING (CRITICAL!)"
            ERRORS=$((ERRORS + 1))
        else
            echo "⚠️  $file - MISSING (Warning)"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

echo
echo "📋 Critical Configuration Files:"
echo "--------------------------------"

# Metro configuration (MOST CRITICAL)
check_file "packages/openchs-android/metro.config.js" "CRITICAL"
check_file "packages/openchs-android/metro.config.js.final-working-version" "BACKUP"

# Node.js Polyfills
check_file "packages/openchs-android/polyfills/bindings.js" "CRITICAL"
check_file "packages/openchs-android/polyfills/crypto.js" "CRITICAL"

# Configuration files
check_file "packages/openchs-android/babel.config.js" "CRITICAL"
check_file "packages/openchs-android/react-native.config.js" "CRITICAL"
check_file "packages/openchs-android/package.json" "CRITICAL"

echo
echo "🔧 Android Configuration Files:"
echo "-------------------------------"

# Android configurations
check_file "packages/openchs-android/android/app/build.gradle" "CRITICAL"
check_file "packages/openchs-android/android/build.gradle" "CRITICAL"  
check_file "packages/openchs-android/android/gradle.properties" "CRITICAL"

echo
echo "📦 Patch Application Verification:"
echo "----------------------------------"

cd packages/openchs-android

# Check patch application
if npx patch-package --error-on-fail > /dev/null 2>&1; then
    echo "✅ All patches apply successfully"
else
    echo "🚨 Patch application FAILED!"
    ERRORS=$((ERRORS + 1))
fi

# Check specific fixed patches exist
check_file "patches/@react-native-clipboard+clipboard+1.16.3.patch" "WARNING"
check_file "patches/jail-monkey+2.8.4.patch" "WARNING" 
check_file "patches/react-native-keychain+8.2.0.patch" "WARNING"

cd ../..

echo
echo "🎯 Metro Configuration Content Check:"
echo "------------------------------------"

if [ -f "packages/openchs-android/metro.config.js" ]; then
    if grep -q "getDefaultConfig" packages/openchs-android/metro.config.js; then
        echo "✅ Metro extends @react-native/metro-config"
    else
        echo "🚨 Metro config missing @react-native/metro-config extension"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "polyfills" packages/openchs-android/metro.config.js; then
        echo "✅ Metro config includes polyfills"
    else
        echo "🚨 Metro config missing polyfills configuration"
        ERRORS=$((ERRORS + 1))
    fi
fi

echo
echo "📊 Summary:"
echo "----------"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -eq 0 ]; then
    echo "🎉 SUCCESS: All critical files present!"
    exit 0
else
    echo "💥 FAILURE: $ERRORS critical files missing!"
    echo ""
    echo "🔧 Recovery Instructions:"
    echo "See upgradeAvniClient.md.m for detailed recovery steps"
    exit 1
fi
