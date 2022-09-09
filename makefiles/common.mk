define _get_abi_version # $1 = Avni Abi Number
	$(eval abiVersion:=$(shell node packages/openchs-android/scripts/version.js $(version) $1))
endef

app_android_package_name := com.openchsclient

set_default_node_version:
	. ${NVM_DIR}/nvm.sh && nvm alias default 16
