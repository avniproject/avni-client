patch:
	cd packages/openchs-android && npx patch-package @react-native-firebase/analytics --include "build.gradle"
	cd packages/openchs-android && npx patch-package @react-native-firebase/app --include "build.gradle"

	cd packages/openchs-android && npx patch-package react-native-background-worker
	cd packages/openchs-android && npx patch-package react-native-smooth-pincode-input --include "index.js"
	cd packages/openchs-android && npx patch-package react-native-video --include "Video.js"
	cd packages/openchs-android && npx patch-package react-native-video-player --include "index.js"
	cd packages/openchs-android && npx patch-package react-native-deprecated-custom-components --include "(Navigator.js)|(NavigatorBreadcrumbNavigationBar.js)|(NavigatorNavigationBar.js)"

	cd packages/openchs-android && npx patch-package react-native-background-job --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-i18n --include "ReactNativeI18n.java"


apply_patch:
	cd packages/openchs-android && npx patch-package

pull_models_from_local:
	cd ../avni-models && make deploy-to-avni-client-only local=../avni-client

patch-i18n:
	cd packages/openchs-android && npx patch-package react-native-i18n