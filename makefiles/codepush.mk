# App Center: https://docs.microsoft.com/en-us/appcenter/distribution/codepush/cli
# Code Push: https://github.com/Microsoft/react-native-code-push
# Terminology. Organisation = Samanvay.
# 	It can have multiple apps. Each app has an attribute which can be used for alpha, beta, etc.
#	Each app has two deployments - staging and production. More deployments can be created depending the development team's workflow. Promotion is used to move them. A deployment can be rolledback.
#	Each deployment has multiple releases.
#	Each release can be patched

# Terms
# Deployment name like Staging, Production
# Abi number based on scheme of OpenCHS, viz. 1, 2, 3, 4

include makefiles/common.mk

define _codepush_release_an_abi ## $1 = Deployment name; $2 =
	$(call _get_abi_version,1)
	appcenter codepush release-react -d $1 -t $(abiVersion)
endef

define _codepush_release ## $1 = Deployment name
	$(call _codepush_release_an_abi,$1,$2)
endef

codepush_help:
	@echo "Before running any command you need to run codepush_setup target. For performing any operations with appcenter portal, you need to run 'appcenter login'. It will launch browser and guide you through the process."

codepush_setup:
	npm install -g appcenter-cli
	appcenter login
	appcenter apps set-current Samanvay-Research-and-Development-Foundation/OpenCHS-Field-App-Alpha

codepush_deploy_to_internal_test:
	appcenter codepush release-react -a Samanvay-Research-and-Development-Foundation/OpenCHS-Field-App-Alpha -d internal

codepush_metrics:
	appcenter codepush deployment list

codepush_release_staging: ## Make parameters, version=APK Version
