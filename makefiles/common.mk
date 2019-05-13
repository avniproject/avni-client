define _get_abi_version
	$(eval abiVersion:=$(shell node packages/openchs-android/scripts/version.js $(version) $1))
endef