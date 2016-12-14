# Build Status
[![Build Status](https://snap-ci.com/OpenCHS/openchs-client/branch/master/build_image)](https://snap-ci.com/OpenCHS/openchs-client/branch/master)

# Join our discussions
[![Gitter](https://badges.gitter.im/gitterHQ/gitter.svg)](https://gitter.im/openchs/openchs)

# Code Quality
[![Code Climate](https://codeclimate.com/github/OpenCHS/openchs-client/badges/gpa.svg)](https://codeclimate.com/github/OpenCHS/openchs-client)   [![Test Coverage](https://codeclimate.com/github/OpenCHS/openchs-client/badges/coverage.svg)](https://codeclimate.com/github/OpenCHS/openchs-client/coverage)  [![Dependency Status](https://gemnasium.com/badges/github.com/OpenCHS/openchs-client.svg)](https://gemnasium.com/github.com/OpenCHS/openchs-client)

# Bintray
[ ![Download](https://api.bintray.com/packages/openchs/generic/openchs-client/images/download.svg) ](https://bintray.com/openchs/generic/openchs-client/_latestVersion)

# License
[![License](https://img.shields.io/badge/license-AGPL-green.svg?style=flat)](https://github.com/openchs/openchs-client/blob/master/LICENSE)

# Dev setup
If you are setting up the machine for the first time, make sure you have homebrew
installed. If you have homebrew installed just run
`make install` from the root of this repository.


# Running
Ensure that you have CRASHLYTICS_API_KEY set in your environment variable. Ask one of the existing developers in OpenCHS team to provide you the key. 
To run the application `make run-android`
In the application set the server url of the config location by going to the settings view. If you are using emulator then you would need to use IP address. e.g. http://10.0.0.3:3000/openchs 


# Running tests in Intellij
* Install NodeJS plugin in Intellij
* Open the Mocha Run & Debug Configurations
* Set environment variable as `npm_package_scripts_test=test`
* Set Extra Mocha Options as `--require react-native-mock/mock.js --require src/test/testHelper.js`
* Set Node Interpreter as the project node
* Set the Working Directory to the project root
* User interface to `bdd`
