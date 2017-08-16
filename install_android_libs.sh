#!/bin/bash
set -ex

INITIALIZATION_FILE="$ANDROID_HOME/.initialized-dependencies-$(git log -n 1 --format=%h -- $0)"

if [ ! -e ${INITIALIZATION_FILE} ]; then
    sdkmanager "platforms;android-25"
    sdkmanager "platforms;android-26"
    sdkmanager "platforms;android-23"
    sdkmanager "extras;android;m2repository"
    sdkmanager "tools"
    sdkmanager "platform-tools"
    sdkmanager "build-tools;25.0.1"
    sdkmanager "build-tools;25.0.3"
    sdkmanager "system-images;android-25;google_apis;x86"
    sdkmanager "system-images;android-25;google_apis;x86_64"
    sdkmanager "extras;google;m2repository"
    touch ${INITIALIZATION_FILE}
fi
