# Build Status

[![Join the chat at https://gitter.im/OpenCHS/openchs-client](https://badges.gitter.im/OpenCHS/openchs-client.svg)](https://gitter.im/OpenCHS/openchs-client?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![CircleCI](https://circleci.com/gh/OpenCHS/openchs-client.svg?style=svg)](https://circleci.com/gh/OpenCHS/openchs-client)

# Join our discussions
[![Gitter](https://badges.gitter.im/gitterHQ/gitter.svg)](https://gitter.im/openchs/openchs)

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
 - To run the application `make run_app`
 - In the application set the server url of the config location by going to the settings view.
 You can either run openchs-server locally or point to an existing server such as http://staging.openchs.org

# Running Tests on Intellij
- Open the openchs-client as one project
- Go to any of the tests in the package you are working on.
- Edit Configuration, edit the global Jest configuration.
- Change the working directory to the package you are working on.
- Change the Jest to use the package specific jest from the node modules
- Use the Global Node Interpreter (preferably the latest version) 
