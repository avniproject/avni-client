#@react-native-firebase/analytics
#@react-native-firebase/app

patch_packages:
	cd packages/openchs-android && npx patch-package @react-native-firebase/analytics --include "build.gradle"
	cd packages/openchs-android && npx patch-package @react-native-firebase/app --include "build.gradle"

	cd packages/openchs-android && npx patch-package @react-native-picker/picker --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-device-info --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-vector-icons --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-webview --include "build.gradle"
	cd packages/openchs-android && npx patch-package realm --include "build.gradle"
	cd packages/openchs-android && npx patch-package react-native-i18n --include "ReactNativeI18n.java"

apply_patch:
	cd packages/openchs-android && npx patch-package
