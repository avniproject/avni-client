#!/bin/bash
set -ex
echo y | android update sdk --no-ui --all --filter android-23
echo y | android update sdk --no-ui --all --filter extra-android-m2repository
echo y | android update sdk --no-ui --all --filter tools
echo y | android update sdk --no-ui --all --filter platform-tools
echo y | android update sdk --no-ui --all --filter build-tools-23.0.1
echo y | android update sdk --no-ui --all --filter build-tools-23.0.3
echo y | android update sdk --no-ui --all --filter sys-img-x86_64-android-23
echo y | android update sdk --no-ui --all --filter sys-img-x86-android-23
echo y | android update sdk --no-ui --all --filter extra-google-m2repository
