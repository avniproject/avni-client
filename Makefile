# Objects: env, apk, packager, app
define test
	cd packages/openchs-$1; npm test
endef

clean: clean_env

deps: build_env
ip:=$(shell ifconfig | grep -A 2 'vboxnet' | tail -1 | cut -d ' ' -f 2 | cut -d ' ' -f 1)
setup_hosts:
	cd packages/openchs-android; adb root
	cd packages/openchs-android; adb remount
	cd packages/openchs-android; cat /etc/hosts|sed 's/127.0.0.1/'$(ip)'/' > /tmp/hosts-adb
	echo '$(ip)	dev.openchs.org' >> /tmp/hosts-adb
	cd packages/openchs-android; adb push /tmp/hosts-adb /system/etc/hosts

test-health-modules:
	$(call test,health-modules)

test-android:
	$(call test,android)

test-models:
	$(call test,models)

test: test-models test-health-modules test-android


release:
	cd packages/openchs-android/android; GRADLE_OPTS="-Xmx250m -Xms250m" ./gradlew assembleRelease

release-demo:
	ENVFILE=.env.demo make release

release-staging:
	ENVFILE=.env.staging make release

release-offline:
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease

log:
	adb logcat *:S ReactNative:V ReactNativeJS:V

ts := $(shell /bin/date "+%Y-%m-%d---%H-%M-%S")

deploy:
	make deps
	make release
	@curl -T packages/openchs-android/android/app/build/outputs/apk/app-release.apk -umihirk:$(BINTRAY_API_KEY) https://api.bintray.com/content/openchs/generic/openchs-client/dev/openchs-client-$(ts).apk?publish=1

# <db>
get_db:
	mkdir -p ../db; adb pull /data/data/com.openchsclient/files/default.realm ../db

open_db: get_db
	open ../db/default.realm
# </db>


# <apk>
uninstall_apk:
	adb uninstall com.openchsclient

install_apk:
	adb install packages/openchs-android/android/app/build/outputs/apk/app-release.apk

reinstall_apk: uninstall_apk install_apk

reinstall: uninstall_apk run_app

local_deploy_apk:
	cp packages/openchs-android/android/app/build/outputs/apk/app-release.apk ../openchs-server/external/app.apk

openlocation_apk:
	open packages/openchs-android/android/app/build/outputs/apk
# </apk>


# <env>
clean_env:
	rm -rf packages/openchs-android/node_modules
	rm -rf packages/openchs-health-modules/node_modules
	rm -rf packages/openchs-models/node_modules

setup_env:
	npm install -g jest@20.0.1
	npm install -g jest-cli@20.0.1

build_env:
	npm install
	npm run bootstrap
# </env>


# <packager>
run_packager:
	cd packages/openchs-android && REACT_EDITOR=subl npm start
# </packager>


# <app>
run_app: setup_hosts
	cd packages/openchs-android && react-native run-android

# sometimes there are errors for which we need to run the following to get the exact problem
run_app_debug: setup_hosts
	cd packages/openchs-android/android && ./gradlew installDebug --stacktrace
# </app>


# <deploy_rules>
deploy_rules:
	cd packages/openchs-health-modules; make deploy_package
# </deploy_rules>


# <crash>
analyse_crash:
	cd packages/unminifiy && npm start ../openchs-android/android/app/build/generated/sourcemap.js $(line) $(column)
# </crash>


# <metadata>
deploy_metadata:
	cd packages/openchs-health-modules && make deploy_metadata

deploy_metadata_and_demo: deploy_metadata
	cd packages/demo-organisation && make deploy_refdata
# </metadata>