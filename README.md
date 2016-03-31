# openchs-client
CHS client which will run on android and web browser for end user

### Dev Setup

* Install/update to the latest node and npm using brew `brew install node`
* Follow these steps for react-native setup - https://facebook.github.io/react-native/docs/getting-started.html
* Follow these steps for android react-native setup - https://facebook.github.io/react-native/docs/android-setup.html
* Do an npm install from the root of the repository
* Run `npm run dev` to get the local webapp server up and running
* Run react-native run-android with the genymotion machine up for the android app

#### Notes
The index.android.js is the main root for the android components, and the app/js/components have the web view components, the common JS code can go in app/js/common right now and can be imported appropriately

###TODO
* Remove unused dependencies.
* Slim down the build process.
* Better folder structure.
* Automate dependency resolution and dev setup for Mac.
* Setup CI.
* Setup artifact push for npm and android.
