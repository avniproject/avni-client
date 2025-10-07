#!/bin/bash
set -e

# React Native Version Compatibility Test Script
# Purpose: Find last RN version where manual linking produces working runtime
# Target: RN 0.72.x - 0.79.x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/rn_version_tests"
mkdir -p "$LOG_DIR"

# Versions to test (newest to oldest)
VERSIONS=(
    "0.79.6"
    "0.79.0"
    "0.78.6"
    "0.78.0"
    "0.77.4"
    "0.77.0"
    "0.76.6"
    "0.76.0"
    "0.75.4"
    "0.75.0"
    "0.74.7"
    "0.74.0"
    "0.73.9"
    "0.73.0"
    "0.72.17"
    "0.72.8"
)

RESULTS_FILE="$LOG_DIR/test_results.txt"
echo "React Native Version Compatibility Test Results" > "$RESULTS_FILE"
echo "Started: $(date)" >> "$RESULTS_FILE"
echo "=================================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

test_version() {
    local version=$1
    local version_log="$LOG_DIR/test_${version}.log"
    
    log "========================================="
    log "Testing React Native ${version}"
    log "========================================="
    
    echo "" >> "$RESULTS_FILE"
    echo "## React Native ${version}" >> "$RESULTS_FILE"
    
    # Step 1: Install version
    log "Step 1/5: Installing react-native@${version}..."
    cd "$SCRIPT_DIR/packages/openchs-android"
    
    if npm install "react-native@${version}" --legacy-peer-deps > "$version_log" 2>&1; then
        log_success "Installation successful"
        echo "- ✅ Installation: SUCCESS" >> "$RESULTS_FILE"
    else
        log_error "Installation failed"
        echo "- ❌ Installation: FAILED" >> "$RESULTS_FILE"
        echo "  See: $version_log" >> "$RESULTS_FILE"
        return 1
    fi
    
    # Step 2: Clean build
    log "Step 2/5: Cleaning build..."
    cd android
    if ./gradlew clean >> "$version_log" 2>&1; then
        log_success "Clean successful"
    else
        log_warning "Clean had warnings (continuing)"
    fi
    
    # Step 3: Build APK
    log "Step 3/5: Building APK..."
    if ./gradlew assembleGenericDebug >> "$version_log" 2>&1; then
        log_success "Build successful"
        echo "- ✅ Build: SUCCESS" >> "$RESULTS_FILE"
    else
        log_error "Build failed"
        echo "- ❌ Build: FAILED" >> "$RESULTS_FILE"
        echo "  See: $version_log" >> "$RESULTS_FILE"
        return 1
    fi
    
    # Step 4: Check for native libraries
    log "Step 4/5: Checking native libraries..."
    APK_PATH="app/build/outputs/apk/generic/debug/app-generic-arm64-v8a-debug.apk"
    
    if [ -f "$APK_PATH" ]; then
        # List all .so files
        SO_FILES=$(aapt list "$APK_PATH" 2>/dev/null | grep "lib.*\.so$" | sort)
        echo "$SO_FILES" > "$LOG_DIR/libs_${version}.txt"
        
        # Check for critical libraries
        CRITICAL_LIBS=(
            "libjsi.so"
            "libreactnative.so"
            "libhermes.so"
            "libfbjni.so"
        )
        
        MISSING_LIBS=()
        for lib in "${CRITICAL_LIBS[@]}"; do
            if echo "$SO_FILES" | grep -q "$lib"; then
                log_success "$lib present"
            else
                log_error "$lib MISSING"
                MISSING_LIBS+=("$lib")
            fi
        done
        
        if [ ${#MISSING_LIBS[@]} -eq 0 ]; then
            echo "- ✅ Native Libraries: ALL PRESENT" >> "$RESULTS_FILE"
        else
            echo "- ⚠️  Native Libraries: ${MISSING_LIBS[*]} MISSING" >> "$RESULTS_FILE"
        fi
        
        # List all libs in results
        echo "  Libraries found: $(echo "$SO_FILES" | wc -l)" >> "$RESULTS_FILE"
        echo "  See: $LOG_DIR/libs_${version}.txt" >> "$RESULTS_FILE"
    else
        log_error "APK not found"
        echo "- ❌ APK: NOT FOUND" >> "$RESULTS_FILE"
        return 1
    fi
    
    # Step 5: Runtime test (if device/emulator connected)
    log "Step 5/5: Runtime test..."
    if adb devices | grep -q "device$"; then
        log "Device detected, installing and testing..."
        
        # Install APK
        if adb install -r "$APK_PATH" > /dev/null 2>&1; then
            log_success "APK installed"
            
            # Clear logcat
            adb logcat -c
            
            # Start app
            adb shell am start -n com.openchsclient/.MainActivity > /dev/null 2>&1
            
            # Wait and check for crashes
            sleep 5
            
            # Check logcat for errors
            LOGCAT_OUTPUT=$(adb logcat -d | grep -E "MainActivity|ReactNative|UnsatisfiedLink|FATAL")
            
            if echo "$LOGCAT_OUTPUT" | grep -q "UnsatisfiedLinkError"; then
                MISSING_SO=$(echo "$LOGCAT_OUTPUT" | grep "UnsatisfiedLinkError" | head -1 | sed -n 's/.*library "\([^"]*\)".*/\1/p')
                log_error "Runtime crash: Missing library $MISSING_SO"
                echo "- ❌ Runtime: CRASH - Missing $MISSING_SO" >> "$RESULTS_FILE"
                echo "$LOGCAT_OUTPUT" > "$LOG_DIR/logcat_${version}.txt"
            elif echo "$LOGCAT_OUTPUT" | grep -q "FATAL EXCEPTION"; then
                log_error "Runtime crash: Fatal exception"
                echo "- ❌ Runtime: CRASH - Fatal exception" >> "$RESULTS_FILE"
                echo "$LOGCAT_OUTPUT" > "$LOG_DIR/logcat_${version}.txt"
            else
                log_success "Runtime: App started successfully!"
                echo "- ✅ Runtime: SUCCESS - App started" >> "$RESULTS_FILE"
                echo "- ⭐ **WINNER: This version works!**" >> "$RESULTS_FILE"
                return 0
            fi
        else
            log_error "Failed to install APK"
            echo "- ❌ Runtime: Install failed" >> "$RESULTS_FILE"
        fi
    else
        log_warning "No device connected, skipping runtime test"
        echo "- ⏭️  Runtime: SKIPPED (no device)" >> "$RESULTS_FILE"
    fi
    
    cd "$SCRIPT_DIR"
}

# Main execution
log "Starting React Native version compatibility testing"
log "Testing ${#VERSIONS[@]} versions"
log ""

WORKING_VERSIONS=()
FAILED_VERSIONS=()

for version in "${VERSIONS[@]}"; do
    if test_version "$version"; then
        WORKING_VERSIONS+=("$version")
        log_success "✅ React Native ${version}: WORKING"
        
        # If we found a working version, we can stop (optional)
        log ""
        log "🎉 Found working version: ${version}"
        log "You may press Ctrl+C to stop, or let it continue testing older versions"
        log ""
    else
        FAILED_VERSIONS+=("$version")
        log_error "❌ React Native ${version}: FAILED"
    fi
    
    log ""
    sleep 2
done

# Summary
echo "" >> "$RESULTS_FILE"
echo "=================================================" >> "$RESULTS_FILE"
echo "SUMMARY" >> "$RESULTS_FILE"
echo "=================================================" >> "$RESULTS_FILE"
echo "Completed: $(date)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

if [ ${#WORKING_VERSIONS[@]} -gt 0 ]; then
    echo "✅ Working versions: ${WORKING_VERSIONS[*]}" >> "$RESULTS_FILE"
    log_success "Testing complete! Found ${#WORKING_VERSIONS[@]} working version(s)"
    log_success "Working versions: ${WORKING_VERSIONS[*]}"
    log ""
    log "Recommended: Use React Native ${WORKING_VERSIONS[0]}"
else
    echo "❌ No working versions found" >> "$RESULTS_FILE"
    log_error "No working versions found in tested range"
fi

if [ ${#FAILED_VERSIONS[@]} -gt 0 ]; then
    echo "❌ Failed versions: ${FAILED_VERSIONS[*]}" >> "$RESULTS_FILE"
fi

log ""
log "Full results saved to: $RESULTS_FILE"
log "Individual logs saved to: $LOG_DIR/"
