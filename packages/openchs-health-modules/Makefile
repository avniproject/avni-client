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


port=8021
server=localhost


# <env> (Code Environment)
test_env: ## Run unit tests
	npm test

build_env: ## Install npm dependencies
	npm install
# </env>


# <rules>
build_rules: ## Create webpack files for all the rules
	python build/json_validation.py health_modules
	rm -f output/*.js
	./node_modules/.bin/webpack --config build/programEncounterDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build/encounterDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build/individualRegistrationDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build/programEnrolmentDecisionWebpack.config.js
	./node_modules/.bin/webpack --config build/programConfigWebpack.config.js

deploy_rules: build_rules ## build_rules and deploy them to the server
	cp -r output/*.js ../../../openchs-server/external/
	cp -r health_modules/*.json ../../../openchs-server/external/
	date
# </rules>

# <metadata>
deploy_metadata: ## Upload metadata to server
	curl -X POST http://$(server):$(port)/concepts -d @health_modules/commonConcepts.json -H "Content-Type: application/json"

	curl -X POST http://$(server):$(port)/forms -d @health_modules/outpatient/metadata/encounterForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/concepts -d @health_modules/outpatient/metadata/concepts.json -H "Content-Type: application/json"

	curl -X POST http://$(server):$(port)/concepts -d @health_modules/mother/metadata/motherConcepts.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/programs -d @health_modules/mother/metadata/motherProgram.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/mother/metadata/motherProgramEnrolmentForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/mother/metadata/motherANCForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/mother/metadata/motherDeliveryForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/mother/metadata/motherAbortionForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/mother/metadata/motherPNCForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/mother/metadata/motherProgramExitForm.json -H "Content-Type: application/json"

	curl -X POST http://$(server):$(port)/concepts -d @health_modules/child/metadata/concepts.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/programs -d @health_modules/child/metadata/childProgram.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/child/metadata/childProgramEnrolmentForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/child/metadata/childDefaultProgramEncounterForm.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/child/metadata/childProgramExitForm.json -H "Content-Type: application/json"

	curl -X POST http://$(server):$(port)/forms -d @health_modules/ncd/metadata/screeningEncounterForm.json -H "Content-Type: application/json"

	curl -X POST http://$(server):$(port)/programs -d @health_modules/diabetes/metadata/diabetesProgram.json -H "Content-Type: application/json"
	curl -X POST http://$(server):$(port)/forms -d @health_modules/diabetes/metadata/diabetesProgramEncounterForm.json -H "Content-Type: application/json"
	date
# </metadata>


# <package>
build_package: ## Builds a deployable package
	rm -f output/openchs_health_modules.tar.gz
	rm -rf output/health_modules
	mkdir output/health_modules
	cp -r health_modules/commonConcepts.json health_modules/child/metadata health_modules/mother/metadata health_modules/diabetes/metadata health_modules/ncd/metadata health_modules/outpatient/metadata health_modules/deploy.sh output/health_modules/
	cd output/health_modules && tar zcvf ../openchs_health_modules.tar.gz commonConcepts.json metadata deploy.sh
# </package>


# <Workflows related, Composite, Convenience and Conventional Actions>
deploy: deploy_metadata
test: test_env
# </Workflows related, Composite, Convenience and Conventional Actions>