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

check-node-v:
ifneq ($(shell node -v),$(shell cat .nvmrc))
	@echo -e '\nPlease run `nvm install $(shell cat .nvmrc) && nvm use $(shell cat .nvmrc)`\n'
	@exit 1
endif
	@echo "node => $(shell node -v)"

include makefiles/codepush.mk
include makefiles/fastlane.mk
include makefiles/androidDevice.mk

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
deps: build_env ##
deps_ci: build_env_ci ##

ignore_deps_changes:
	git checkout package-lock.json
# </deps>

#for emulators using virtualbox
ip:=$(shell ifconfig | grep -A 2 'vboxnet' | grep 'inet ' | tail -1 | xargs | cut -d ' ' -f 2 | cut -d ':' -f 2)
#for default Andoird Emulator
ip:=$(if $(ip),$(ip),$(shell ifconfig | grep -A 2 'wlp' | grep 'inet ' | tail -1 | xargs | cut -d ' ' -f 2 | cut -d ':' -f 2))
sha:=$(shell git rev-parse --short=4 HEAD)

setup_hosts:
	sed 's/SERVER_URL_VAR/$(ip)/g' packages/openchs-android/config/env/dev.json.template > packages/openchs-android/config/env/dev.json

# <test>
test-health-modules: setup_hosts as_dev
	$(call test,health-modules)

test-android: setup_hosts as_dev
	$(call test,android)

test: test-android  ##
# </test>

# <bugsnag>

define _upload_release_sourcemap
	cd packages/openchs-android/android/app/build/generated && npx bugsnag-sourcemaps upload \
		--api-key ${OPENCHS_CLIENT_BUGSNAG_API_KEY} \
		--app-version $(versionName) \
		--minified-file assets/react/release/index.android.bundle \
		--source-map sourcemap.js \
		--overwrite \
		--minified-url "index.android.bundle" \
		--upload-sources
	$(call _open_resource,https://app.bugsnag.com/settings/samanvay-research-and-development-foundation/projects/openchs-client/source-maps)
endef

upload-release-sourcemap: ##Uploads release sourcemap to Bugsnag
	$(call _upload_release_sourcemap)
# </bugsnag>

# <release>

define _create_config
	@echo "Creating config for $1"
	@echo "module.exports = Object.assign(require('../../config/env/$(1).json'), {COMMIT_ID: '$(sha)'});" > packages/openchs-android/src/framework/Config.js
endef

as_dev: ; $(call _create_config,dev)
as_staging: ; $(call _create_config,staging)
as_staging_dev: ; $(call _create_config,staging_dev)
as_uat: ; $(call _create_config,uat)
as_prerelease: ; $(call _create_config,prerelease)
as_prod: ; $(call _create_config,prod)
as_prod_dev: ; $(call _create_config,prod_dev)

release_clean:
	rm -f packages/openchs-android/android/app/build/outputs/apk/*.apk
	rm -rf packages/openchs-android/android/app/build
	mkdir -p packages/openchs-android/android/app/build/generated
	mkdir -p packages/openchs-android/android/app/build/generated/res/react/release
	mkdir -p packages/openchs-android/android/app/build/generated/assets/react/release
	rm -rf packages/openchs-android/default.realm.*

create_apk:
	cd packages/openchs-android/android; GRADLE_OPTS="$(if $(GRADLE_OPTS),$(GRADLE_OPTS),-Xmx1024m -Xms1024m)" ./gradlew assembleRelease --stacktrace --w

release: release_clean create_apk

release_dev: setup_hosts as_dev release

release_prod: renew_env as_prod release
	$(call _upload_release_sourcemap)

release_staging: renew_env as_staging
	enableSeparateBuildPerCPUArchitecture=false make release

release_staging_without_clean: as_staging
	enableSeparateBuildPerCPUArchitecture=false make release

release_uat: renew_env as_uat
	enableSeparateBuildPerCPUArchitecture=false make release

release_uat_without_clean: as_uat
	$(call _create_config,uat)
	enableSeparateBuildPerCPUArchitecture=false make release

release_prerelease: renew_env as_prerelease
	$(call _create_config,prerelease)
	enableSeparateBuildPerCPUArchitecture=false make release

release_prerelease_without_clean: as_prerelease
	$(call _create_config,prerelease)
	enableSeparateBuildPerCPUArchitecture=false make release

release-offline: ##
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease
# </release>

# <log>
log:  ## Log android
	adb logcat *:S ReactNative:V ReactNativeJS:V BackgroundTask:V

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

appdb:=$(if $(appdb),$(appdb),../db/default.realm)

put_db: ## Apply realmdb from ../default.realm
	adb push $(appdb) /data/data/${app_android_package_name}/files/default.realm

rm_db:
	rm -rf ../db

kill_realm_browser:
	pkill "Realm Browser" || true

open_db: rm_db get_db ## Open realmdb in Realm Browser
	$(call _open_resource,../db/default.realm)
# </db>

local_deploy_apk: ##
	cp packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk ../openchs-server/external/app.apk

openlocation_apk: ## Open location of built apk
	open packages/openchs-android/android/app/build/outputs/apk

# <env>
clean_packager_cache:
	-watchman watch-del-all && rm -rf $(TMPDIR)/react-*
	rm -rf /tmp/metro-*
	rm -rf /tmp/haste-*

clean_env:  ##
	rm -rf packages/openchs-android/node_modules
	rm -rf packages/openchs-org/node_modules
	rm -rf packages/unminifiy/node_modules
	rm -rf packages/utilities/node_modules

clean_all:  clean_env clean_packager_cache
	rm -rf packages/openchs-android/android/app/src/main/assets/index.android.bundle

setup_env: ##
	npm install -g jest@20.0.1
	npm install -g jest-cli@20.0.1

build_env: ##
	npm i -g react-native-cli
	npm install
	export NODE_OPTIONS=--max_old_space_size=4096
	npm run bootstrap
# </env>


build_env_ci: ##
	npm install
	export NODE_OPTIONS=--max_old_space_size=2048
	npm run bootstrap-ci

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

upload-staging-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk"

upload-prerelease-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/prerelease-apks/prerelease-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/prerelease-apks/prerelease-$(sha)-$(dat).apk"

upload-uat-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/uat-apks/uat-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/uat-apks/uat-$(sha)-$(dat).apk"

upload-prod-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-universal-release.apk s3://samanvay/openchs/prod-apks/prod-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/prod-apks/prod-$(sha)-$(dat).apk"

upload-prod-apk-x86:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-x86-release.apk s3://samanvay/openchs/prod-apks/prod-x86-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/prod-apks/prod-x86-$(sha)-$(dat).apk"

upload-prod-apk-arm:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk s3://samanvay/openchs/prod-apks/prod-arm-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/prod-apks/prod-arm-$(sha)-$(dat).apk"

define _inpremise_upload_prod_apk
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/$(orgname)/apks/prod-$(sha)-$(dat).apk;
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/$(orgname)/apks/prod-$(sha)-$(dat).apk"
endef

#orgname needs to be provided
inpremise_upload_prod_apk:
	$(if $(orgname),$(call _inpremise_upload_prod_apk),@echo "\nNeeded: orgname=")

#$(MAKECMDGOALS): check-node-v ;

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
	make auth poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) username=admin password=$(OPENCHS_PROD_ADMIN_USER_PASSWORD)
	echo $(token)

upload = \
	curl -X POST $(server):$(port)/$(1) -d $(2)  \
		-H "Content-Type: application/json"  \
		-H "USER-NAME: admin"  \
		-H "AUTH-TOKEN: $(token)"


deploy_translations: deploy_platform_translations

deploy_platform_translations: auth dev_deploy_platform_translations

dev_deploy_platform_translations:
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

deploy_platform_translations_staging:
ifndef password
	@echo "Please provide password"
	exit 1
else
	make deploy_translations poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=https://staging.avniproject.org port=443 username=admin password=$(password)
endif

deploy_platform_translations_uat:
	make deploy_translations poolId=$(OPENCHS_UAT_USER_POOL_ID) clientId=$(OPENCHS_UAT_APP_CLIENT_ID) server=https://uat.avniproject.org port=443 username=admin password=$(password)

deploy_platform_translations_prerelease:
	make deploy_translations poolId=$(OPENCHS_PRERELEASE_USER_POOL_ID) clientId=$(OPENCHS_PRERELEASE_APP_CLIENT_ID) server=https://prerelease.avniproject.org port=443 username=admin password=$(password)

deploy_platform_translations_live:
	make deploy_translations poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.avniproject.org port=443 username=admin password=$(password)
