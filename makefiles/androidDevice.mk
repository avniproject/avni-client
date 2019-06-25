define _start_app
	adb shell am start -n com.openchsclient/com.openchsclient.MainActivity
endef

define _install_apk
	adb install packages/openchs-android/android/app/build/outputs/apk/release/$1
endef

uninstall_apk: ##
	adb uninstall com.openchsclient

clear_app_data:
	adb shell pm clear com.openchsclient

install_universal_apk: ##
	$(call _install_apk,app-release.apk)
	$(call _start_app)

install_apk:
	$(call _install_apk,app-x86-release.apk)

reinstall_app: uninstall_apk run_app

# Manage app already installed on the device
define _kill_app
	adb shell am force-stop $1
endef

kill_app:
	$(call _kill_app,com.openchsclient)

start_app:
	$(call _start_app)

open_playstore_openchs:
	$(call _kill_app,com.google.android.gms)
	adb shell am start -a android.intent.action.VIEW -d 'market://details?id=com.openchsclient'


# Run application from the code
_run_app: ; cd packages/openchs-android && react-native run-android
_run_app_release: ; cd packages/openchs-android && react-native run-android --variant=release

run_app: setup_hosts as_dev _run_app

run_app_release: as_dev _run_app_release

run_app_staging: as_staging _run_app
run_app_uat: as_uat _run_app
run_app_prerelease: as_prerelease _run_app
run_app_prod: as_prod _run_app

open_app_bundle:
	cd ..
	-mkdir ./temp
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&minify=false" -o ./temp/output.txt
	vi ./temp/output.txt