#!/bin/bash
set -ex

INITIALIZATION_FILE="$ANDROID_HOME/.initialized-dependencies-$(git log -n 1 --format=%h -- $0)"

if [ ! -e ${INITIALIZATION_FILE} ]; then
    echo y | android update sdk --no-ui --all --filter android-25
    echo y | android update sdk --no-ui --all --filter extra-android-m2repository
    echo y | android update sdk --no-ui --all --filter tools
    echo y | android update sdk --no-ui --all --filter platform-tools
    echo y | android update sdk --no-ui --all --filter build-tools-25.0.1
    echo y | android update sdk --no-ui --all --filter build-tools-25.0.3
    echo y | android update sdk --no-ui --all --filter sys-img-x86_64-android-25
    echo y | android update sdk --no-ui --all --filter sys-img-x86-android-25
    echo y | android update sdk --no-ui --all --filter extra-google-m2repository
    touch ${INITIALIZATION_FILE}
fi
