# Objects: env, apk, packager, app
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


define _setBuildVersion
	cd packages/openchs-android/ && cp .env.template .env;
	git describe --tags>>packages/openchs-android/.env;
endef

setenv:
	$(call _setBuildVersion)

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
	git checkout packages/openchs-health-modules/package-lock.json
# </deps>

ip:=$(shell ifconfig | grep -A 2 'vboxnet' | grep 'inet ' | tail -1 | xargs | cut -d ' ' -f 2 | cut -d ':' -f 2)
sha:=$(shell git rev-parse --short HEAD)
setup_hosts:
	adb root
	adb remount
	adb pull /system/etc/hosts /tmp/hosts-adb
	sed -i.bak '/dev.openchs.org/d' /tmp/hosts-adb
	echo '$(ip)	dev.openchs.org' >> /tmp/hosts-adb
	adb push /tmp/hosts-adb /system/etc/hosts
# <test>
test-health-modules: ##
	$(call test,health-modules)

test-android: ##
	$(call test,android)

test-models: ##
	$(call test,models)

test: test-models test-health-modules test-android  ##
# </test>

# <bugsnag>
define _upload_release_sourcemap ## Uploads release sourcemap to Bugsnag
	cd packages/openchs-android && npx bugsnag-sourcemaps upload \
		--api-key ${OPENCHS_CLIENT_BUGSNAG_API_KEY} \
		--app-version $(shell cat packages/openchs-android/android/app/build.gradle | sed -n  's/versionName \"\(.*\)\"/\1/p' | xargs echo | sed -e "s/\(.*\)/\"\1\"/") \
		--minified-file android/app/src/main/assets/index.android.bundle \
		--source-map android/app/build/generated/sourcemap.js \
		--overwrite \
		--minified-url "index.android.bundle" \
		--upload-sources
endef

upload-release-sourcemap: ##Uploads release sourcemap to Bugsnag
	$(call _upload_release_sourcemap)
# </bugsnag>

# <release>
release: ##
	rm -f packages/openchs-android/android/app/build/outputs/apk/*.apk
	rm -rf packages/openchs-android/android/app/build
	rm -rf packages/openchs-android/android/app/src/main/assets
	mkdir -p packages/openchs-android/android/app/src/main/assets
	rm -rf packages/openchs-android/default.realm.*
	cd packages/openchs-android; react-native bundle --platform android --dev false --entry-file index.android.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
	cd packages/openchs-android/android; GRADLE_OPTS="$(if $(GRADLE_OPTS),$(GRADLE_OPTS),-Xmx1024m -Xms1024m)" ./gradlew assembleRelease

release-inpremise:
	ENVFILE=.env.inpremise make release
	$(call _upload_release_sourcemap)

release-vivek: ##
	ENVFILE=.env.devs.vivek make release

release-arjun: ##
	ENVFILE=.env.devs.arjun make release

release-live: ##
	ENVFILE=.env.live make clean_env deps release
	$(call _upload_release_sourcemap)

release-staging: ##
	ENVFILE=.env.staging make clean_env deps release

release-uat: ##
	ENVFILE=.env.uat make clean_env deps release

release-offline: ##
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease

release-offline-vivek: ##
	cd packages/openchs-android/android; ENVFILE=.env.devs.vivek ./gradlew --offline assembleRelease
# </release>

# <log>
log:  ##
	adb logcat *:S ReactNative:V ReactNativeJS:V

clear-log: ##
	adb logcat -c
# </log>

ts := $(shell /bin/date "+%Y-%m-%d---%H-%M-%S")
dat := $(shell /bin/date "+%Y-%m-%d-%H-%M-%S")

# <deploy>
deploy: ## Deploy apk to bintray
	make deps
	make release
	@curl -T packages/openchs-android/android/app/build/outputs/apk/app-release.apk -umihirk:$(BINTRAY_API_KEY) https://api.bintray.com/content/openchs/generic/openchs-client/dev/openchs-client-$(ts).apk?publish=1
# <deploy>

# <db>
get_db: ## Get realmdb and copy to ../
	mkdir -p ../db; adb pull /data/data/com.openchsclient/files/default.realm ../db

appdb:=$(if $(appdb),$(appdb),../db/default.realm)

put_db: ## Apply realmdb from ../default.realm
	adb push $(appdb) /data/data/com.openchsclient/files/default.realm

rm_db:
	rm -rf ../db

kill_realm_browser:
	pkill "Realm Browser" || true

open_db: rm_db get_db ## Open realmdb in Realm Browser
	$(if $(shell command -v xdg-open 2> /dev/null),make xdg-opendb,make mac-opendb)

mac-opendb:
	open ../db/default.realm

xdg-opendb:
	xdg-open ../db/default.realm >/dev/null 2>&1

# </db>


# <apk>
uninstall_apk: ##
	adb uninstall com.openchsclient

install_apk: ##
	adb install packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk
	adb shell am start -n com.openchsclient/com.openchsclient.MainActivity

reinstall_apk: uninstall_apk install_apk ##

reinstall: uninstall_apk run_app ##

local_deploy_apk: ##
	cp packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk ../openchs-server/external/app.apk

openlocation_apk: ##
	open packages/openchs-android/android/app/build/outputs/apk

scp_apk:
	scp packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk $(host):~/Downloads/
# </apk>


# <env>
clean_packager_cache:
	watchman watch-del-all && rm -rf $TMPDIR/react-*

clean_env:  ##
	rm -rf packages/openchs-android/node_modules
	rm -rf packages/openchs-health-modules/node_modules
	rm -rf packages/openchs-models/node_modules

clean_all:  clean_env
	rm -rf packages/openchs-android/package-lock.json
	rm -rf packages/openchs-health-modules/package-lock.json
	rm -rf packages/openchs-models/package-lock.json

setup_env: ##
	npm install -g jest@20.0.1
	npm install -g jest-cli@20.0.1

build_env: ##
	npm install
	export NODE_OPTIONS=--max_old_space_size=4096
	npm run bootstrap
# </env>


build_env_ci: ##
	npm install
	export NODE_OPTIONS=--max_old_space_size=4096
	npm run bootstrap-ci

# <packager>
run_packager: ##
	cd packages/openchs-android
	REACT_EDITOR=$([ "$REACT_EDITOR" == "" ] && echo "subl" || echo "$REACT_EDITOR")
	npm start
# </packager>


# <app>
run_app: setup_hosts ##
	cd packages/openchs-android && ENVFILE=.env react-native run-android

run_app_release: setup_hosts
	cd packages/openchs-android && react-native run-android --variant=release

run_app_staging_dev:
	cd packages/openchs-android && ENVFILE=.env.staging.dev react-native run-android

run_app_staging:
	cd packages/openchs-android && ENVFILE=.env.staging react-native run-android

run_app_uat:
	cd packages/openchs-android && ENVFILE=.env.uat react-native run-android

run_app_live:
	cd packages/openchs-android && ENVFILE=.env.live react-native run-android

open_app_bundle:
	cd ..
	mkdir ./temp
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&hot=false&minify=false" -o ./temp/output.txt
	vi ./temp/output.txt
# sometimes there are errors for which we need to run the following to get the exact problem
run_app_debug: setup_hosts  ##
	cd packages/openchs-android/android && ./gradlew installDebug --stacktrace

open_app_bundle:
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&hot=false&minify=false" -o ../temp/output.txt
	vi ../temp/output.txt

kill_app:
	adb shell am force-stop com.openchsclient
# </app>



# <crash>
analyse_crash: ##
	cd packages/unminifiy && npm start ../openchs-android/android/app/build/generated/sourcemap.js $(line) $(column)
# </crash>


# <metadata>
deploy_metadata:  ## Deploy demo metadata
	cd packages/openchs-health-modules && make deploy_metadata
	@echo
	@echo
	@echo 'Skipping "cd packages/openchs-org && make deploy_locations"'
	@echo 'Uncomment if you want'
	@echo
	cd packages/openchs-org && make deploy_locations

deploy_common_concepts_dev:
	cd packages/openchs-health-modules && make deploy_common_concepts_dev

deploy_common_concepts_staging:
	cd packages/openchs-health-modules && make auth deploy_common_concepts_dev poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=https://staging.openchs.org port=443 username=admin password=$(password)

deploy_common_concepts_uat:
	cd packages/openchs-health-modules && make auth deploy_common_concepts_dev poolId=$(OPENCHS_UAT_USER_POOL_ID) clientId=$(OPENCHS_UAT_APP_CLIENT_ID) server=https://uat.openchs.org port=443 username=admin password=$(password)

deploy_common_concepts_live:
	cd packages/openchs-health-modules && make auth deploy_common_concepts_dev poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.openchs.org port=443 username=admin password=$(password)

deploy_metadata_staging:
	cd packages/openchs-health-modules && make deploy poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=https://staging.openchs.org port=443 username=admin password=$(password)
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=https://staging.openchs.org port=443 username=admin password=$(password)

deploy_metadata_uat:
	cd packages/openchs-health-modules && make deploy poolId=$(OPENCHS_UAT_USER_POOL_ID) clientId=$(OPENCHS_UAT_APP_CLIENT_ID) server=https://uat.openchs.org port=443 username=admin password=$(password)
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_UAT_USER_POOL_ID) clientId=$(OPENCHS_UAT_APP_CLIENT_ID) server=https://uat.openchs.org port=443 username=admin password=$(password)

deploy_metadata_staging_local:
	cd packages/openchs-health-modules && make deploy poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=http://localhost port=8021 username=admin password=$(password)
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=http://localhost port=8021 username=admin password=$(password)

deploy_metadata_live:
	cd packages/openchs-health-modules && make deploy poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.openchs.org port=443 username=admin password=$(password)
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.openchs.org port=443 username=admin password=$(password)

deploy_locations_uat:
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_UAT_USER_POOL_ID) clientId=$(OPENCHS_UAT_APP_CLIENT_ID) server=https://uat.openchs.org port=443 username=admin password=$(password)

deploy_locations_staging:
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=https://staging.openchs.org port=443 username=admin password=$(password)

deploy_locations_live:
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.openchs.org port=443 username=admin password=$(password)

deploy_metadata_refdata: deploy_metadata ## Deploy common metadata and demo refdata
	cd packages/demo-organisation && make deploy

deploy_referral_concepts_fix_prod:
	cd packages/openchs-health-modules && make deploy_referral_concepts_fix poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.openchs.org port=443 username=admin password=$(password)
# </metadata>

screencap:
	mkdir -p ./tmp/
	adb exec-out screencap -p > ./tmp/`date +%Y-%m-%d-%T`.png

upload-staging-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk"

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

#server,port args need to be provided
lbp_inpremise_deploy:
	cd packages/openchs-health-modules && make deploy poolId=$(OPENCHS_LBP_PROD_USER_POOL_ID) clientId=$(OPENCHS_LBP_PROD_APP_CLIENT_ID) username=admin password=$(password) server=$(server) port=$(port)
	cd packages/openchs-org && make deploy_locations poolId=$(OPENCHS_LBP_PROD_USER_POOL_ID) clientId=$(OPENCHS_LBP_PROD_APP_CLIENT_ID) username=admin password=$(password) server=$(server) port=$(port)

define _inpremise_upload_prod_apk
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/release/app-release.apk s3://samanvay/openchs/$(orgname)/apks/prod-$(sha)-$(dat).apk;
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/$(orgname)/apks/prod-$(sha)-$(dat).apk"
endef

#orgname needs to be provided
inpremise_upload_prod_apk:
	$(if $(orgname),$(call _inpremise_upload_prod_apk),@echo "\nNeeded: orgname=")

get-token-prod:
	cd packages/openchs-health-modules && make get-token poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) server=https://server.openchs.org port=443 username=$(username) password=$(password)

get-token-staging:
	cd packages/openchs-health-modules && make get-token poolId=$(OPENCHS_STAGING_USER_POOL_ID) clientId=$(OPENCHS_STAGING_APP_CLIENT_ID) server=https://staging.openchs.org port=443 username=$(username) password=$(password)

get-token-uat:
	cd packages/openchs-health-modules && make get-token poolId=$(OPENCHS_UAT_USER_POOL_ID) clientId=$(OPENCHS_UAT_APP_CLIENT_ID) server=https://uat.openchs.org port=443 username=$(username) password=$(password)
