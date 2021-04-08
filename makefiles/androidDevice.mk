define _start_app
	adb shell am start -n ${app_android_package_name}/com.openchsclient.MainActivity
endef

define _install_apk
	adb install packages/openchs-android/android/app/build/outputs/apk/release/$1
endef

uninstall_apk: ##
	-adb uninstall ${app_android_package_name}

clear_app_data:
	adb shell pm clear ${app_android_package_name}

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
	$(call _kill_app,${app_android_package_name})

start_app:
	$(call _start_app)

restart_app: kill_app start_app

open_playstore_openchs:
	$(call _kill_app,com.google.android.gms)
	adb shell am start -a android.intent.action.VIEW -d 'market://details?id=${app_android_package_name}'


# Run application from the code
_run_app: ; cd packages/openchs-android && react-native run-android
_run_app_release: ; cd packages/openchs-android && react-native run-android --variant=release

run_app: setup_hosts as_dev _run_app

run_app_release: as_dev _run_app_release

run_app_staging: as_staging _run_app
run_app_staging_dev: as_staging_dev _run_app
run_app_uat: as_uat _run_app
run_app_prerelease: as_prerelease _run_app
run_app_prod: as_prod _run_app

stop_app:
	adb shell am force-stop ${app_android_package_name}

switch_app_to_env:
ifeq ($(env),dev)
	$(call _setup_hosts)
endif
	make clear_app_data
	$(call _create_config,$(env))
	make start_app

switch_app_to_dev:
	make switch_app_to_env env=dev

switch_app_to_staging:
	make switch_app_to_env env=staging

switch_app_to_uat:
	make switch_app_to_env env=uat

switch_app_to_prerelease:
	make switch_app_to_env env=prerelease

switch_app_to_prod:
	make switch_app_to_env env=prod

open_app_bundle:
	cd ..
	-mkdir ./temp
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&minify=false" -o ./temp/output.txt
	vi ./temp/output.txt