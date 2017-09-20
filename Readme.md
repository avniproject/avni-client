# Build Status
[![CircleCI](https://circleci.com/gh/OpenCHS/openchs-client.svg?style=svg)](https://circleci.com/gh/OpenCHS/openchs-client)

# Join our discussions
[![Gitter](https://badges.gitter.im/gitterHQ/gitter.svg)](https://gitter.im/openchs/openchs)

# Code Quality
[![Code Climate](https://codeclimate.com/github/OpenCHS/openchs-client/badges/gpa.svg)](https://codeclimate.com/github/OpenCHS/openchs-client)   [![Test Coverage](https://codeclimate.com/github/OpenCHS/openchs-client/badges/coverage.svg)](https://codeclimate.com/github/OpenCHS/openchs-client/coverage)  [![Dependency Status](https://gemnasium.com/badges/github.com/OpenCHS/openchs-client.svg)](https://gemnasium.com/github.com/OpenCHS/openchs-client)

# Bintray
[ ![Download](https://api.bintray.com/packages/openchs/generic/openchs-client/images/download.svg) ](https://bintray.com/openchs/generic/openchs-client/_latestVersion)

# License
[![License](https://img.shields.io/badge/license-AGPL-green.svg?style=flat)](https://github.com/openchs/openchs-client/blob/master/LICENSE)

# Dev setup
 The following dependencies are required to run in local
 - android-sdk and android libs specified in setup/roles/android-build/files/install_android_libs.sh
 - node.js 
 - react-native installed globally
 - An android device (either a phone or an emulator such as genymotion)
 - A running openchs-server (Optional. You can use the staging server - http://staging.openchs.org if you don't want to run this locally)


# Running
 - Ensure that you have CRASHLYTICS_API_KEY set in your environment variable. Ask one of the existing developers in OpenCHS team to provide you the key.
 - Ensure android device is on and is recognised by adb (adb devices)
 - To run the application `make run-android`
 - In the application set the server url of the config location by going to the settings view. 
 You can either run openchs-server locally or point to an existing server such as http://staging.openchs.org
