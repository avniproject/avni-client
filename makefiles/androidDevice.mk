define _start_app
	adb shell am start -n ${app_android_package_name}/com.openchsclient.MainActivity
endef

define _install_apk
	adb install packages/openchs-android/android/app/build/outputs/apk/release/$1
endef

uninstall_apk:
	-adb uninstall ${app_android_package_name}
uninstall-apk: uninstall_apk

clear_app_data:
	-adb shell pm clear ${app_android_package_name}

install_universal_apk:
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
kill-app: kill_app

start_app:
	$(call _start_app)
start-app: start_app

restart_app: kill_app start_app
restart-app: restart_app

open_playstore_openchs:
	$(call _kill_app,com.google.android.gms)
	adb shell am start -a android.intent.action.VIEW -d 'market://details?id=${app_android_package_name}'

metro_config:
ifeq ($(flavor), lfe)
	$(shell cp packages/openchs-android/metro.config.lfe.js packages/openchs-android/metro.config.js)
else
	$(shell cp packages/openchs-android/metro.config.generic.js packages/openchs-android/metro.config.js)
endif

# Run application from the code
# Note: prebuild removed - autolinking now handled by Gradle task automatically
_run_app:
	make metro_config flavor=$(flavor)
	cd packages/openchs-android && npx react-native run-android --mode "$(flavor)Debug" --appId "$(app_android_package_name)"
_run_app_release:
	make metro_config flavor=$(flavor)
	cd packages/openchs-android && npx react-native run-android --mode "$(flavor)Release" --appId "$(app_android_package_name)"

run_app: setup_hosts as_dev _run_app
run-app: run_app

run_app_release: as_dev _run_app_release

run_app_staging: as_staging _run_app
run-app-staging: run_app_staging
run_app_staging_dev: as_staging_dev _run_app
run-app-staging-dev: run_app_staging_dev
run_app_perf: as_perf _run_app
run_app_prerelease: as_prerelease _run_app
run-app-prerelease: run_app_prerelease
run_app_prerelease_dev: as_prerelease_dev _run_app
run-app-prerelease-dev: run_app_prerelease_dev
run_app_prod: as_prod _run_app
run-app-prod: run_app_prod
run_app_prod_dev: as_prod_dev _run_app
run-app-prod-dev: run_app_prod_dev
run_app_no_env: as_no_env _run_app
run_app_prod_lfe_dev: as_prod_lfe_dev _run_app
run_app_prod_gramin_dev: as_prod_gramin_dev _run_app
run-app-prod-gramin-dev: run_app_prod_gramin_dev
run_app_staging_gramin_dev: as_staging_gramin_dev _run_app
run-app-staging-gramin-dev: run_app_staging_gramin_dev

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

switch_app_to_perf:
	make switch_app_to_env env=perf

switch_app_to_prod:
	make switch_app_to_env env=prod

open_app_bundle:
	cd ..
	-mkdir ./temp
	curl "http://$(AVNI_HOST):8081/index.android.bundle?platform=android&dev=true&minify=false" -o ./temp/output.txt
	vi ./temp/output.txt

fill_text:
	@adb shell input text $(text)

fill_password:
	@adb shell input text $(text)
	@adb shell input keyevent 61
	@adb shell input keyevent 61
	@adb shell input keyevent 61
	@adb shell input keyevent 61
	@adb shell input keyevent 61
	@adb shell input keyevent 61
	@adb shell input keyevent 61
	@adb shell input keyevent 66

disable_network:
	adb shell "svc wifi disable"
	adb shell "svc data disable"

enable_network:
	adb shell "svc wifi enable"
	adb shell "svc data enable"

reboot_device:
	adb shell am broadcast -a android.intent.action.BOOT_COMPLETED
