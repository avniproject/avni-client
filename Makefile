include packages/openchs-health-modules/Makefile

define test
	cd packages/openchs-$1; npm test
endef

run-android:
	cd packages/openchs-android && react-native run-android

run-packager:
	cd packages/openchs-android && REACT_EDITOR=subl npm start

clean:
	rm -rf packages/openchs-android/node_modules
	rm -rf packages/openchs-health-modules/node_modules
	rm -rf packages/openchs-models/node_modules

deps:
	npm install
	npm run bootstrap

test-health-modules:
	$(call test,health-modules)

test-android:
	$(call test,android)

test-models:
	$(call test,models)

test: test-models test-health-modules test-android

release:
	cd packages/openchs-android/android; ./gradlew assembleRelease

release-offline:
	cd packages/openchs-android/android; ./gradlew --offline assembleRelease

log:
	adb logcat *:S ReactNative:V ReactNativeJS:V

uninstall:
	adb uninstall com.openchsclient

reinstall: uninstall run-android

ts := $(shell /bin/date "+%Y-%m-%d---%H-%M-%S")

deploy:
	make deps
	make release
	@curl -T packages/openchs-android/android/app/build/outputs/apk/app-release.apk -umihirk:$(BINTRAY_API_KEY) https://api.bintray.com/content/openchs/generic/openchs-client/dev/openchs-client-$(ts).apk?publish=1

database-client:
	adb pull /data/data/com.openchsclient/files/default.realm

reinstall-release: uninstall
	adb install packages/openchs-android/android/app/build/outputs/apk/app-release.apk

deploy-apk-local:
	cp packages/openchs-android/android/app/build/outputs/apk/app-release.apk ../openchs-server/external/app.apk