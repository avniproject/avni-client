ansible_exists := $(shell ansible-playbook --version)
ansible_check:
ifndef ansible_exists
		@echo "Ansible is not installed. Installing Ansible"
		brew install ansible
else
		@echo "Ansible is installed"
endif

define install
	cd packages/openchs-$1; npm install
endef

define test
	cd packages/openchs-$1; npm test
endef

run-android:
	cd packages/openchs-android && react-native run-android

run-packager:
	REACT_EDITOR=subl npm start

deps:
	@echo "******** Bootstrapping dependencies ********"
	npm install
	npm run bootstrap
	@echo "******** Installing packages in openchs-health-models ********"
	cd packages/openchs-models && npm install
	@echo "******** Installing packages in openchs-health-modules ********"
	cd packages/openchs-health-modules && npm install
	@echo "******** Installing packages in openchs-android ********"
	cd packages/openchs-android && npm install

install-health-modules:
	$(call install,health-modules)

test-health-modules:
	$(call test,health-modules)

install-android:
	$(call install,android)

test-android:
	$(call test,android)

install-models:
	$(call install,models)

test-models:
	$(call test,models)

test:
	lerna run test

tests:
	make test

coverage:
	npm run coverage

ci-install:
	@echo "Provisioning CI"
	@echo "Removing node modules"
	rm -rf node_modules/
	download-android
	./install_android_libs.sh

ci-test:
	@echo "Running Tests on CI"
	rm -rf node_modules/
	make deps
	make test
	make coverage
	npm install -g codeclimate-test-reporter
	codeclimate-test-reporter < coverage/lcov.info


release:
	cd android; ./gradlew assembleRelease

release-offline:
	cd android; ./gradlew --offline assembleRelease
log:
	adb logcat *:S ReactNative:V ReactNativeJS:V

uninstall:
	adb uninstall com.openchsclient

reinstall: uninstall run-android

ts := $(shell /bin/date "+%Y-%m-%d---%H-%M-%S")

deploy:
	make deps
	make release
	@curl -T android/app/build/outputs/apk/app-release.apk -umihirk:$(BINTRAY_API_KEY) https://api.bintray.com/content/openchs/generic/openchs-client/dev/openchs-client-$(ts).apk?publish=1

database-client:
	adb pull /data/data/com.openchsclient/files/default.realm

reinstall-release: uninstall
	adb install android/app/build/outputs/apk/app-release.apk

deploy-apk-local:
	cp android/app/build/outputs/apk/app-release.apk ../openchs-server/external/app.apk