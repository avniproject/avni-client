define _start_app
	adb shell am start -n com.openchsclient/com.openchsclient.MainActivity
endef

define _install_apk
	adb install packages/openchs-android/android/app/build/outputs/apk/release/$1
endef

uninstall_apk: ##
	adb uninstall com.openchsclient

install_universal_apk: ##
	$(call _install_apk,app-release.apk)
	$(call _start_app)

install_apk:
	$(call _install_apk,app-x86-release.apk)

kill_app:
	adb shell am force-stop com.openchsclient

start_app:
	$(call _start_app)


# <app>
run_app: ##
	$(call _setup_hosts)
	$(call _create_config,dev)
	cd packages/openchs-android && react-native run-android

run_app_release:
	$(call _create_config,dev)
	cd packages/openchs-android && react-native run-android --variant=release

run_app_staging:
	$(call _create_config,staging)
	cd packages/openchs-android && react-native run-android

run_app_prerelease:
	$(call _create_config,prerelease)
	cd packages/openchs-android && react-native run-android

run_app_uat:
	$(call _create_config,uat)
	cd packages/openchs-android && react-native run-android

run_app_prod:
	$(call _create_config,prod)
	cd packages/openchs-android && react-native run-android

open_app_bundle:
	cd ..
	-mkdir ./temp
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&minify=false" -o ./temp/output.txt
	vi ./temp/output.txt