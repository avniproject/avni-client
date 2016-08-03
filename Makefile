ansible_exists := $(shell ansible-playbook --version)
ansible_check:
ifndef ansible_exists
		@echo "Ansible is not installed. Installing Ansible"
		brew install ansible
else
		@echo "Ansible is installed"
endif

install: ansible_check
	ansible-playbook setup/dev.yml -i setup/local

run-android:
	ANDROID_HOME=/usr/local/opt/android-sdk react-native run-android

run-packager:
	REACT_EDITOR=atom ./node_modules/react-native/packager/packager.sh start --reset-cache

deps:
	npm install

test:
	npm test

ci-test:
	@echo "Running Tests on CI"
	rm -rf node_modules/
	make deps
	make test

release:
	cd android; ./gradlew assembleRelease

log:
	adb logcat *:S ReactNative:V ReactNativeJS:V

uninstall:
	adb uninstall com.openchsclient

reinstall: uninstall run-android

ts := $(shell /bin/date "+%Y-%m-%d---%H-%M-%S")

deploy:
	wget http://dl.google.com/android/android-sdk_r23-linux.tgz -O android.tgz
	tar -xvf android.tgz
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter build-tools-23.0.1
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter build-tools-23.0.3
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter sys-img-x86_64-android-23
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter sys-img-x86-android-23
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter platform-tools
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter extra-google-m2repository
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter extra-android-m2repository
	cd android-sdk-linux/tools; echo y | ./android update sdk --no-ui --all --filter android-23
	make release
	@curl -T android/app/build/outputs/apk/app-release.apk -umihirk:$(BINTRAY_API_KEY) https://api.bintray.com/content/openchs/generic/openchs-client/latest/openchs-client-$(ts).apk
