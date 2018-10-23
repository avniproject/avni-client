# <makefile>
# Objects: metadata, package, env (code platform), rules
# Actions: clean, build, deploy, test
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


port:= $(if $(port),$(port),8021)
server:= $(if $(server),$(server),http://localhost)

# <env> (Code Environment)
test_env: ## Run unit tests
	npm test
# </env>

token:=
poolId:=
clientId:=
username:=
password:=

auth:
	$(if $(poolId),$(eval token:=$(shell node scripts/token.js $(poolId) $(clientId) $(username) $(password))))

auth_live:
	make auth poolId=$(OPENCHS_PROD_USER_POOL_ID) clientId=$(OPENCHS_PROD_APP_CLIENT_ID) username=admin password=$(OPENCHS_PROD_ADMIN_USER_PASSWORD)
	echo $(token)

upload = \
	curl -X POST $(server):$(port)/$(1) -d $(2)  \
		-H "Content-Type: application/json"  \
		-H "USER-NAME: admin"  \
		-H "AUTH-TOKEN: $(token)"

# <rules>
build_rules: ## Create webpack files for all the rules
	python build-config/json_validation.py health_modules
	rm -f output/*.js
	./node_modules/.bin/webpack --config build-config/programEnrolmentDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build-config/programEncounterDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build-config/encounterDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build-config/individualRegistrationDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build-config/programConfigWebpack.config.js
# </rules>

# <metadata>
deploy_metadata: auth dev_deploy_metadata ## Upload metadata to server; poolId,clientId,username,password should be set if not deploying to local

dev_deploy_metadata: ## Upload metadata to server
	@echo "-----------------"
	@echo " Common metadata"
	@echo "-----------------"

	$(call upload,concepts,@health_modules/commonConcepts.json)
	@echo

	$(call upload,concepts,@health_modules/outpatient/metadata/concepts.json)
	@echo
	$(call upload,encounterTypes,@health_modules/outpatient/metadata/encounterTypes.json)
	@echo
	$(call upload,forms,@health_modules/common/metadata/defaultProgramEncounterCancellationForm.json)
	@echo
	$(call upload,forms,@health_modules/outpatient/metadata/encounterForm.json)
	@echo
	$(call upload,formMappings,@health_modules/outpatient/metadata/formMappings.json)
	@echo


	$(call upload,concepts,@health_modules/mother/metadata/motherConcepts.json)
	@echo
	$(call upload,programs,@health_modules/mother/metadata/motherProgram.json)
	@echo
	$(call upload,encounterTypes,@health_modules/mother/metadata/encounterTypes.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherProgramEnrolmentForm.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherANCForm.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherANCLabTestResultsForm.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherDeliveryForm.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherAbortionForm.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherPNCForm.json)
	@echo
	$(call upload,forms,@health_modules/mother/metadata/motherProgramExitForm.json)
	@echo
	$(call upload,formMappings,@health_modules/mother/metadata/formMappings.json)
	@echo
	$(call upload,mother/config,@health_modules/mother/metadata/motherProgramConfig.json)
	@echo

	$(call upload,concepts,@health_modules/child/metadata/concepts.json)
	@echo
	$(call upload,concepts,@health_modules/child/metadata/vaccinationConcepts.json)
	@echo
	$(call upload,programs,@health_modules/child/metadata/childProgram.json)
	@echo
	$(call upload,encounterTypes,@health_modules/child/metadata/encounterTypes.json)
	@echo
	$(call upload,forms,@health_modules/child/metadata/birthForm.json)
	@echo
	$(call upload,forms,@health_modules/child/metadata/childProgramEnrolmentForm.json)
	@echo
	$(call upload,forms,@health_modules/child/metadata/childDefaultProgramEncounterForm.json)
	@echo
	$(call upload,forms,@health_modules/child/metadata/childProgramExitForm.json)
	@echo
	$(call upload,forms,@health_modules/child/metadata/anthroAssessmentForm.json)
	@echo
	$(call upload,formMappings,@health_modules/child/metadata/formMappings.json)
	@echo

	$(call upload,programs,@health_modules/adolescent/metadata/adolescentProgram.json)
	@echo
	$(call upload,concepts,@health_modules/adolescent/metadata/adolescentConcepts.json)
	@echo
	$(call upload,encounterTypes,@health_modules/adolescent/metadata/encounterTypes.json)
	@echo
	$(call upload,forms,@health_modules/adolescent/metadata/adolescentEnrolment.json)
	@echo
	$(call upload,forms,@health_modules/adolescent/metadata/adolescentProgramExitForm.json)
	@echo
	$(call upload,forms,@health_modules/adolescent/metadata/adolescentRoutineVisit.json)
	@echo
	$(call upload,forms,@health_modules/adolescent/metadata/adolescentDropoutForm.json)
	@echo
	$(call upload,forms,@health_modules/adolescent/metadata/adolescentDropoutFollowupForm.json)
	@echo
	$(call upload,forms,@health_modules/adolescent/metadata/adolescentProgramEncounterCancellationForm.json)
	@echo
	$(call upload,formMappings,@health_modules/adolescent/metadata/formMappings.json)
	@echo
	$(call upload,adolescent/config,@health_modules/adolescent/metadata/adolescentProgramConfig.json)
	@echo
	date


# <Workflows related, Composite, Convenience and Conventional Actions>
deploy: deploy_metadata
test: test_env
# </Workflows related, Composite, Convenience and Conventional Actions>

deploy_demo_refdata:
	@echo "----------"
	@echo "demo"
	@echo "----------"
	cd ../demo-organisation && make deploy_refdata server=$(server) port=$(port) token=$(token)

implementations := sewa-rural lbp-arogyadoot

# <deploy-all>
deploy_all_impls: auth deploy deploy_demo_refdata ## Deploy all implementations/ create_org separately before/ optional arguments: server=https://staging.openchs.org port=443
	$(foreach impl,$(implementations),./scripts/deploy_implementation.sh $(impl) $(server) $(port) $(token);)

# </deploy-all>
