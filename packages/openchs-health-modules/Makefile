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


#port=443
#server=https://staging.openchs.org
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
deploy_metadata: auth dev_deploy_metadata## Upload metadata to server

dev_deploy_metadata: ## Upload metadata to server
	@echo "-----------------"
	@echo " Common metadata"
	@echo "-----------------"
	curl -X POST $(server):$(port)/concepts -d @health_modules/commonConcepts.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"

	curl -X POST $(server):$(port)/concepts -d @health_modules/outpatient/metadata/concepts.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/outpatient/metadata/encounterForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"

	curl -X POST $(server):$(port)/concepts -d @health_modules/mother/metadata/motherConcepts.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/programs -d @health_modules/mother/metadata/motherProgram.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/mother/metadata/motherProgramEnrolmentForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/mother/metadata/motherANCForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS"  -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/mother/metadata/motherDeliveryForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/mother/metadata/motherAbortionForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS"  -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/mother/metadata/motherPNCForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS"  -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/mother/metadata/motherProgramExitForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"

	curl -X POST $(server):$(port)/concepts -d @health_modules/child/metadata/concepts.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS"  -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/programs -d @health_modules/child/metadata/childProgram.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/child/metadata/childProgramEnrolmentForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/child/metadata/childDefaultProgramEncounterForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/child/metadata/childProgramExitForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS"   -H "AUTH-TOKEN: $(token)"

	curl -X POST $(server):$(port)/programs -d @health_modules/adolescent/metadata/adolescentProgram.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/concepts -d @health_modules/adolescent/metadata/adolescentConcepts.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/adolescent/metadata/adolescentEnrolment.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/adolescent/metadata/adolescentProgramExitForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/adolescent/metadata/adolescentRoutineVisit.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/adolescent/metadata/adolescentDropoutForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/adolescent/metadata/adolescentDropoutFollowupForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
	curl -X POST $(server):$(port)/forms -d @health_modules/adolescent/metadata/adolescentProgramEncounterCancellationForm.json -H "Content-Type: application/json" -H "ORGANISATION-NAME: OpenCHS" -H "AUTH-TOKEN: $(token)"
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