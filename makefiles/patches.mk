patch:
	cd packages/openchs-android && npx patch-package react-native-background-job --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-smooth-pincode-input --include "index.js"
	cd packages/openchs-android && npx patch-package react-native-video --include "Video.js"
	cd packages/openchs-android && npx patch-package react-native-video-player --include "index.js"
	cd packages/openchs-android && npx patch-package react-native-deprecated-custom-components --include "(Navigator.js)|(NavigatorBreadcrumbNavigationBar.js)|(NavigatorNavigationBar.js)"

apply_patch:
	cd packages/openchs-android && npx patch-package
