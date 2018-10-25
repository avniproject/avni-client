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

define test
	cd packages/openchs-$1; npm test
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


# <release>
release: ##
	rm -f packages/openchs-android/android/app/build/outputs/apk/*.apk
	rm -rf packages/openchs-android/default.realm.*
	cd packages/openchs-android/android; GRADLE_OPTS="-Xmx250m -Xms250m" ./gradlew assembleRelease

release-vivek: ##
	ENVFILE=.env.devs.vivek make release

release-live: ##
	ENVFILE=.env.live make release

release-staging: ##
	ENVFILE=.env.staging make release

release-offline: ##
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease

release-offline-vivek: ##
	cd packages/openchs-android/android; ENVFILE=.env.devs.vivek ./gradlew --offline assembleRelease
# </release>

# <bugsnag>
generate-sourcemap-for-debug: ## Generates sourcemap for debug version of the app
	cd packages/openchs-android ; \
	react-native bundle \
    --platform android \
    --dev true \
    --entry-file index.android.js \
    --bundle-output android-debug.bundle \
    --sourcemap-output android-debug.bundle.map

upload-debug-sourcemap: ## Uploads debug sourcemap to Bugsnag
	bugsnag-sourcemaps upload \
		--api-key ${OPENCHS_CLIENT_BUGSNAG_API_KEY} \
		--app-version $(shell grep -o "versionCode\s\+\d\+" packages/openchs-android/android/app/build.gradle | awk '{ print $$2 }') \
		--minified-file packages/openchs-android/android-debug.bundle \
		--source-map packages/openchs-android/android-debug.bundle.map \
		--overwrite \
		--minified-url "http://10.0.3.2:8081/index.android.bundle?platform=android&dev=true&hot=false&minify=false"

upload-release-sourcemap: ## Uploads release sourcemap to Bugsnag
	bugsnag-sourcemaps upload \
		--api-key ${OPENCHS_CLIENT_BUGSNAG_API_KEY} \
		--app-version $(shell grep -o "versionCode\s\+\d\+" packages/openchs-android/android/app/build.gradle | awk '{ print $$2 }') \
		--minified-file packages/openchs-android/android/app/build/intermediates/assets/release/index.android.bundle \
		--source-map packages/openchs-android/android/app/build/generated/sourcemap.js \
		--overwrite \
		--minified-url "index.android.bundle" \
		--upload-sources
# </bugsnag>

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

put_db: ## Apply realmdb from ../default.realm
	adb push ../db/default.realm /data/data/com.openchsclient/files/default.realm

rm_db:
	rm -rf ../db

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
	adb install packages/openchs-android/android/app/build/outputs/apk/app-release.apk
	adb shell am start -n com.openchsclient/com.openchsclient.MainActivity

reinstall_apk: uninstall_apk install_apk ##

reinstall: uninstall_apk run_app ##

local_deploy_apk: ##
	cp packages/openchs-android/android/app/build/outputs/apk/app-release.apk ../openchs-server/external/app.apk

openlocation_apk: ##
	open packages/openchs-android/android/app/build/outputs/apk

scp_apk:
	scp packages/openchs-android/android/app/build/outputs/apk/app-release.apk $(host):~/Downloads/
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


# <packager>
run_packager: ##
	cd packages/openchs-android
	REACT_EDITOR=$([ "$REACT_EDITOR" == "" ] && echo "subl" || echo "$REACT_EDITOR")
	npm start
# </packager>


# <app>
run_app: setup_hosts ##
	cd packages/openchs-android && react-native run-android

run_app_release: setup_hosts
	cd packages/openchs-android && react-native run-android --variant=release

run_app_staging_dev:
	cd packages/openchs-android && ENVFILE=.env.staging.dev react-native run-android

run_app_staging:
	cd packages/openchs-android && ENVFILE=.env.staging react-native run-android

run_app_live:
	cd packages/openchs-android && ENVFILE=.env.live react-native run-android

open_app_bundle:
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&hot=false&minify=false" -o ../temp/output.txt
	vi ../temp/output.txt
# sometimes there are errors for which we need to run the following to get the exact problem
run_app_debug: setup_hosts  ##
	cd packages/openchs-android/android && ./gradlew installDebug --stacktrace

open_app_bundle:
	curl "http://localhost:8081/index.android.bundle?platform=android&dev=true&hot=false&minify=false" -o ../temp/output.txt
	vi ../temp/output.txt
# </app>



# <crash>
analyse_crash: ##
	cd packages/unminifiy && npm start ../openchs-android/android/app/build/generated/sourcemap.js $(line) $(column)
# </crash>


# <metadata>
deploy_metadata:  ## Deploy demo metadata
	cd packages/openchs-health-modules && make deploy_metadata
	cd packages/openchs-org && make deploy_locations

deploy_metadata_staging:
	cd packages/openchs-health-modules && make deploy poolId=ap-south-1_tuRfLFpm1 clientId=93kp4dj29cfgnoerdg33iev0v server=https://staging.openchs.org port=443 username=admin password=$(STAGING_ADMIN_USER_PASSWORD)
	cd packages/openchs-org && make deploy_locations poolId=ap-south-1_tuRfLFpm1 clientId=93kp4dj29cfgnoerdg33iev0v server=https://staging.openchs.org port=443 username=admin password=$(STAGING_ADMIN_USER_PASSWORD)

deploy_metadata_live:
	cd packages/openchs-health-modules && make deploy poolId=ap-south-1_e1HrpLQnC clientId=4aeeu0e37q1sfsem61qrd0elaq server=https://staging.openchs.org port=443 username=admin password=$(OPENCHS_PROD_ADMIN_USER_PASSWORD)
	cd packages/openchs-org && make deploy_locations poolId=ap-south-1_e1HrpLQnC clientId=4aeeu0e37q1sfsem61qrd0elaq server=https://staging.openchs.org port=443 username=admin password=$(OPENCHS_PROD_ADMIN_USER_PASSWORD)

deploy_metadata_refdata: deploy_metadata ## Deploy common metadata and demo refdata
	cd packages/demo-organisation && make deploy
# </metadata>

screencap:
	mkdir -p ./tmp/
	adb exec-out screencap -p > ./tmp/`date +%Y-%m-%d-%T`.png

upload-staging-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/app-release.apk s3://samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk"

upload-prod-apk:
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/app-universal-release.apk s3://samanvay/openchs/prod-apks/prod-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/prod-apks/prod-$(sha)-$(dat).apk"