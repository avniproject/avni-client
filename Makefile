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
	cd packages/openchs-android/android; GRADLE_OPTS="-Xmx250m -Xms250m" ./gradlew assembleRelease

release-demo: ##
	ENVFILE=.env.demo make release

release-vivek: ##
	ENVFILE=.env.devs.vivek make release

release-live: ##
	ENVFILE=.env.live make release

release-staging: ##
	ENVFILE=.env.staging make release

release-uat: ##
	ENVFILE=.env.uat make release

release-offline: ##
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease

release-offline-vivek: ##
	cd packages/openchs-android/android; ENVFILE=.env.devs.vivek ./gradlew --offline assembleRelease
# </release>

# <log>
log:  ##
	adb logcat *:S ReactNative:V ReactNativeJS:V
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

rm_db:
	rm -rf ../db

open_db: rm_db get_db ## Open realmdb in Realm Browser
	open ../db/default.realm
# </db>


# <apk>
uninstall_apk: ##
	adb uninstall com.openchsclient

install_apk: ##
	adb install packages/openchs-android/android/app/build/outputs/apk/app-x86-release.apk
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

run_app_staging_dev:
	cd packages/openchs-android && ENVFILE=.env.staging.dev react-native run-android

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

deploy_metadata_live:
	cd packages/openchs-health-modules && make deploy_metadata poolId=$(STAGING_USER_POOL_ID) clientId=$(STAGING_APP_CLIENT_ID) username=admin password=$(STAGING_ADMIN_USER_PASSWORD)
#	cd packages/openchs-health-modules && make auth poolId=$(STAGING_USER_POOL_ID) clientId=$(STAGING_APP_CLIENT_ID) username=admin password=$(STAGING_ADMIN_USER_PASSWORD)

deploy_metadata_refdata: deploy_metadata ## Deploy common metadata and demo refdata
	cd packages/demo-organisation && make deploy
# </metadata>

staging-apk: release-staging
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/app-release.apk s3://samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/staging-apks/staging-$(sha)-$(dat).apk"

uat-apk: release-uat
	@aws s3 cp --acl public-read packages/openchs-android/android/app/build/outputs/apk/app-release.apk s3://samanvay/openchs/uat-apks/uat-$(sha)-$(dat).apk
	@echo "APK Available at https://s3.ap-south-1.amazonaws.com/samanvay/openchs/uat-apks/uat-$(sha)-$(dat).apk"

