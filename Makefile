# <makefile>
help:
	@IFS=$$'\n' ; \
	help_lines=(`fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//'`); \
	for help_line in $${help_lines[@]}; do \
	    IFS=$$'#' ; \
	    help_split=($$help_line) ; \
	    help_command=`echo $${help_split[0]} | sed -e 's/^ *//' -e 's/ *$$//'` ; \
	    help_info=`echo $${help_split[2]} | sed -e 's/^ *//' -e 's/ *$$//'` ; \
	    printf "%-30s %s\n" $$help_command $$help_info ; \
	done
# </makefile>


default: ; @echo 'no target provided'

include makefiles/fastlane.mk
include makefiles/androidDevice.mk
include makefiles/patches.mk
include makefiles/util.mk
include makefiles/common.mk

define _open_resource
	$(if $(shell command -v xdg-open 2> /dev/null),xdg-open $1 >/dev/null 2>&1,open $1)
endef

ci:
	$(eval ci_flag_set:=true)

define test
	cd packages/openchs-$1; npm run $(if $(ci_flag_set),test-ci,test)
endef

# <setup>
build-tools:
	sdkmanager "build-tools;26.0.3"
# </setup>

# <clean>
clean: clean_env ##
# </clean>
renew_env: clean_all deps
# <deps>
deps: build_env apply_patch ##
deps_ci: build_env_ci apply_patch ##

ignore_deps_changes:
	git checkout package-lock.json
# </deps>

#for emulators using virtualbox
ip:=$(shell ifconfig | grep -A 2 'vboxnet' | grep 'inet ' | tail -1 | xargs | cut -d ' ' -f 2 | cut -d ':' -f 2)
#for default Andoird Emulator
ip:=$(if $(ip),$(ip),$(shell ifconfig | grep -A 2 'wlp' | grep 'inet ' | tail -1 | xargs | cut -d ' ' -f 2 | cut -d ':' -f 2))
ip:=$(if $(ip),$(ip),$(shell ifconfig | grep -A 2 'en0' | grep 'inet ' | tail -1 | xargs | cut -d ' ' -f 2 | cut -d ':' -f 2))
sha:=$(shell git rev-parse --short=4 HEAD)

ifndef flavor
	flavor:=generic
endif

define _get_from_config
$(shell node -p "require('./packages/openchs-android/config/flavor_config.json').$(1)")
endef

flavor_server_url:=$(call _get_from_config,$(flavor).server_url)
bugsnag_env_var_name:=$(call _get_from_config,$(flavor).bugsnag.env_var_name)
bugsnag_project_name:=$(call _get_from_config,$(flavor).bugsnag.project_name)
app_android_package_name:=$(call _get_from_config,$(flavor).package_name)
prod_admin_password_env_var_name:=$(call _get_from_config,$(flavor).prod_admin_password_env_var_name)

setup_hosts:
	sed 's/SERVER_URL_VAR/$(ip)/g' packages/openchs-android/config/env/dev.json.template > packages/openchs-android/config/env/dev.json

# <test>
test-android: setup_hosts as_dev
	$(call test,android)

test: test-android  ##
# </test>

# <bugsnag>

define _upload_release_sourcemap
	cd packages/openchs-android/android/app/build/generated && npx bugsnag-sourcemaps upload \
		--api-key $$$(bugsnag_env_var_name) \
		--app-version $(versionName) \
		--minified-file assets/react/$(flavor)/release/index.android.bundle \
		--source-map sourcemap.js \
		--overwrite \
		--minified-url "index.android.bundle" \
		--upload-sources
	$(call _open_resource,https://app.bugsnag.com/settings/samanvay-research-and-development-foundation/projects/$(bugsnag_project_name)/source-maps)
endef

upload-release-sourcemap: ##Uploads release sourcemap to Bugsnag
ifndef $(bugsnag_env_var_name)
	@echo "$(bugsnag_env_var_name) env var not present"
	exit 1
else
	$(call _upload_release_sourcemap)
endif
# </bugsnag>

# <release>

define _create_config
	@echo "Creating config for $1"
	@if [ $(1) = "prod" ]; then \
		echo "module.exports = Object.assign(require('../../config/env/$(1).json'), {COMMIT_ID: '$(sha)', SERVER_URL: '$(flavor_server_url)'});" > packages/openchs-android/src/framework/Config.js; \
	else \
	 	echo "module.exports = Object.assign(require('../../config/env/$(1).json'), {COMMIT_ID: '$(sha)'});" > packages/openchs-android/src/framework/Config.js; \
	fi
endef

as_dev: ; $(call _create_config,dev)
as_staging: ; $(call _create_config,staging)
as_staging_dev: ; $(call _create_config,staging_dev)
as_uat: ; $(call _create_config,uat)
as_prerelease: ; $(call _create_config,prerelease)
as_perf: ; $(call _create_config,perf)
as_prod: ; $(call _create_config,prod)
as_prod_dev: ; $(call _create_config,prod_dev)

release_clean:
	rm -rf packages/openchs-android/android/app/build
	mkdir -p packages/openchs-android/android/app/build/generated
	mkdir -p packages/openchs-android/android/app/build/generated/res/react/release
	mkdir -p packages/openchs-android/android/app/build/generated/assets/react/release
	rm -rf packages/openchs-android/default.realm.*
	# https://github.com/facebook/react-native/issues/28954#issuecomment-632967679
	rm -rf packages/openchs-android/android/.gradle

create_apk:
	cd packages/openchs-android; react-native bundle --platform android --dev false --entry-file index.android.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ && rm -rf android/app/src/main/res/drawable-* && rm -rf android/app/src/main/res/raw/*
	cd packages/openchs-android/android; GRADLE_OPTS="$(if $(GRADLE_OPTS),$(GRADLE_OPTS),-Xmx1024m -Xms1024m)" ./gradlew assemble$(flavor)Release --stacktrace --w

create_bundle:
	cd packages/openchs-android; react-native bundle --platform android --dev false --entry-file index.android.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ && rm -rf android/app/src/main/res/drawable-* && rm -rf android/app/src/main/res/raw/*
	cd packages/openchs-android/android; GRADLE_OPTS="$(if $(GRADLE_OPTS),$(GRADLE_OPTS),-Xmx1024m -Xms1024m)" ./gradlew bundle$(flavor)Release --stacktrace --w

release: release_clean create_apk
bundle_release: release_clean create_bundle
release_dev: setup_hosts as_dev release

release_prod_without_clean: as_prod release upload-release-sourcemap
release_prod: renew_env release_prod_without_clean

bundle_release_prod_without_clean: as_prod bundle_release upload-release-sourcemap
bundle_release_prod: renew_env release_prod_without_clean

bundle_clean:
	rm -rf packages/openchs-android/android/app/bundles
	mkdir -p packages/openchs-android/android/app/bundles

define _copy_bundle
	cp -r packages/openchs-android/android/app/build/outputs/bundle/$(1)Release packages/openchs-android/android/app/bundles
endef

release_prod_all_flavors_without_clean: bundle_clean
	make bundle_release_prod_without_clean flavor='lfe'
	$(call _copy_bundle,lfe)
	make bundle_release_prod_without_clean flavor='generic'
	$(call _copy_bundle,generic)
	open packages/openchs-android/android/app/bundles
release_prod_all_flavors: bundle_clean
	make bundle_release_prod flavor='generic'
	$(call _copy_bundle,generic)
	make bundle_release_prod flavor='lfe'
	$(call _copy_bundle,lfe)
	open packages/openchs-android/android/app/bundles

release_staging_playstore_without_clean: as_staging release
release_staging_playstore: renew_env release_staging_playstore_without_clean

release_prod_unsigned_without_clean: as_prod
	enableSeparateBuildPerCPUArchitecture=false make release

release_staging_without_clean: as_staging
	enableSeparateBuildPerCPUArchitecture=false make release
release_staging: renew_env release_staging_without_clean

release_uat_without_clean: as_uat
	$(call _create_config,uat)
	enableSeparateBuildPerCPUArchitecture=false make release
release_uat: renew_env release_uat_without_clean

release_prerelease_without_clean: as_prerelease
	$(call _create_config,prerelease)
	enableSeparateBuildPerCPUArchitecture=false make release
release_prerelease: renew_env release_prerelease_without_clean

release_perf_without_clean: as_perf
	$(call _create_config,perf)
	enableSeparateBuildPerCPUArchitecture=false make release
release_perf: renew_env release_perf_without_clean

release-offline: ##
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease
# </release>

# <log>
log:  ## Log android
	adb logcat *:S ReactNative:V ReactNativeJS:V BackgroundTask:V

log_error_only:  ## Log android
	adb logcat *:S ReactNative:E ReactNativeJS:E BackgroundTask:E

log_background_job:
	adb logcat | grep -e ReactNativeEventStarter -e BackgroundJob

log_info: ## Log adb info level
	adb logcat *:S ReactNative:W ReactNativeJS:I

log_all: ## Log everything in android
	adb logcat

clear-log: ## Clear adb logs
	adb logcat -c
# </log>

enable_firebase_debug_view:
	adb shell setprop debug.firebase.analytics.app ${app_android_package_name}

disable_firebase_debug_view:
	adb shell setprop debug.firebase.analytics.app .none.

ts := $(shell /bin/date "+%Y-%m-%d---%H-%M-%S")
dat := $(shell /bin/date "+%Y-%m-%d-%H-%M-%S")

# <db>
get_db: ## Get realmdb and copy to ../
	mkdir -p ../db; adb pull /data/data/${app_android_package_name}/files/default.realm ../db

get_anon_db: ## Get anon realmdb and copy to ../
	mkdir -p ../db; adb pull /data/data/${app_android_package_name}/files/anonymized.realm ../db
	adb shell rm /data/data/${app_android_package_name}/files/anonymized.realm

appdb:=$(if $(appdb),$(appdb),../db/default.realm)

put_db: ## Apply realmdb from ../default.realm
	adb push $(appdb) /data/data/${app_android_package_name}/files/default.realm

rm_db:
	rm -rf ../db

kill_realm_browser:
	pkill "Realm Browser" || true

open_db: rm_db get_db open_db_only
open_db_only:
	$(call _open_resource,../db/default.realm)
# </db>

local_deploy_apk: ##
	cp packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk ../openchs-server/external/app.apk

openlocation_apk: ## Open location of built apk
	open packages/openchs-android/android/app/build/outputs/apk

open_location_bundles:
	open packages/openchs-android/android/app/bundles

# <env>
clean_packager_cache:
	-watchman watch-del-all && rm -rf $(TMPDIR)/react-*
	rm -rf /tmp/metro-*
	rm -rf /tmp/haste-*

clean_env: release_clean ##
	rm -rf packages/openchs-android/node_modules
	rm -rf packages/openchs-org/node_modules
	rm -rf packages/unminifiy/node_modules
	rm -rf packages/utilities/node_modules

remove_package_locks:
	rm package-lock.json packages/openchs-android/package-lock.json

clean_all:  clean_env clean_packager_cache
	rm -rf packages/openchs-android/android/app/src/main/assets/index.android.bundle

setup_env: ##
	npm install -g jest@20.0.1
	npm install -g jest-cli@20.0.1

build_env: ##
	export NODE_OPTIONS=--max_old_space_size=4096
	cd packages/openchs-android && npm install --legacy-peer-deps

clean_app:
	cd packages/openchs-android/android && ./gradlew clean

build_app:
	cd packages/openchs-android/android && ./gradlew assembleDebug

build: build_env build_app
# </env>


build_env_ci: ##
	export NODE_OPTIONS=--max_old_space_size=2048
	cd packages/openchs-android && npm install --legacy-peer-deps

# <packager>
run_packager: ##
	REACT_EDITOR=$([ "$REACT_EDITOR" == "" ] && echo "subl" || echo "$REACT_EDITOR")
	cd packages/openchs-android && npm start
# </packager>


# sometimes there are errors for which we need to run the following to get the exact problem
run_app_debug: setup_hosts
	cd packages/openchs-android/android && ./gradlew installDebug --stacktrace
# </app>



# <crash>
analyse_crash: ##
	cd packages/unminifiy && npm start ../openchs-android/android/app/build/generated/sourcemap.js $(line) $(column)
# </crash>




screencap:
	mkdir -p ./tmp/
	adb exec-out screencap -p > ./tmp/`date +%Y-%m-%d-%T`.png

define _upload_apk
	aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/$(flavor)/release/app-$(flavor)-release.apk s3://samanvay/openchs/$(1)-apks/$(flavor)/$(1)-$(flavor)-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/$(1)-apks/$(flavor)/$(1)-$(flavor)-$(sha)-$(dat).apk"
endef

upload-prod-apk-unsigned: ; $(call _upload_apk,prod)
upload-staging-apk: ; $(call _upload_apk,staging)
upload-prerelease-apk: ; $(call _upload_apk,prerelease)
upload-uat-apk: ; $(call _upload_apk,uat)

define _inpremise_upload_prod_apk
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/$(orgname)/apks/prod-$(sha)-$(dat).apk;
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/$(orgname)/apks/prod-$(sha)-$(dat).apk"
endef

#orgname needs to be provided
inpremise_upload_prod_apk:
	$(if $(orgname),$(call _inpremise_upload_prod_apk),@echo "\nNeeded: orgname=")

#Translations
port:= $(if $(port),$(port),8021)
server:= $(if $(server),$(server),http://localhost)

token:=
poolId:=
clientId:=
username:=
password:=

auth:
	$(if $(password),$(eval token:=$(shell node packages/openchs-android/scripts/token.js '$(server):$(port)' $(username) $(password))))

get-token: auth
	@echo
	@echo $(token)
	@echo

auth_live:
	make get-token server=$(flavor_server_url) port=443 username=admin password=$$$(prod_admin_password_env_var_name)

upload = \
	curl -X POST $(server):$(port)/$(1) -d $(2)  \
		-H "Content-Type: application/json"  \
		-H "USER-NAME: admin"  \
		-H "AUTH-TOKEN: $(token)"


deploy_translations: deploy_platform_translations

deploy_platform_translations: auth dev_deploy_platform_translations

dev_deploy_platform_translations:
ifndef password
	@echo "Please provide password"
	exit 1
else
	$(call upload,platformTranslation,@packages/openchs-android/translations/en.json)
	@echo
	$(call upload,platformTranslation,@packages/openchs-android/translations/gu_IN.json)
	@echo
	$(call upload,platformTranslation,@packages/openchs-android/translations/hi_IN.json)
	@echo
	$(call upload,platformTranslation,@packages/openchs-android/translations/mr_IN.json)
	@echo
	$(call upload,platformTranslation,@packages/openchs-android/translations/ta_IN.json)
	@echo
	$(call upload,platformTranslation,@packages/openchs-android/translations/ka_IN.json)
endif


deploy_platform_translations_staging:
	make deploy_translations server=https://staging.avniproject.org port=443 username=admin password=$(OPENCHS_STAGING_ADMIN_PASSWORD)

deploy_platform_translations_uat:
	make deploy_translations server=https://uat.avniproject.org port=443 username=admin password=$(password)

deploy_platform_translations_prerelease:
	make deploy_translations server=https://prerelease.avniproject.org port=443 username=admin password=$(OPENCHS_PRERELEASE_ADMIN_PASSWORD)

deploy_platform_translations_for_flavor_live:
	make deploy_translations server=$(flavor_server_url) port=443 username=admin password=$$$(prod_admin_password_env_var_name)

deploy_platform_translations_live_for_all_flavors:
	make deploy_platform_translations_for_flavor_live flavor='lfe'
	make deploy_platform_translations_for_flavor_live flavor='generic'
