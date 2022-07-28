patch:
	cd packages/openchs-android && npx patch-package react-native-background-job --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-smooth-pincode-input --include "index.js"
	cd packages/openchs-android && npx patch-package react-native-video --include "Video.js"
	cd packages/openchs-android && npx patch-package react-native-video-player --include "index.js"

apply_patch:
	cd packages/openchs-android && npx patch-package patch-package
