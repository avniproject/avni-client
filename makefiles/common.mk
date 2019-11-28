define _get_abi_version # $1 = Avni Abi Number
	$(eval abiVersion:=$(shell node packages/openchs-android/scripts/version.js $(version) $1))
endef