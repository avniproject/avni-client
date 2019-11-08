import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Encounter, Individual, OrganisationConfig, ProgramEncounter, ProgramEnrolment} from "openchs-models";
import General from "../utility/General";
import _ from "lodash";

@Service("customFilterService")
class CustomFilterService extends BaseService {
    constructor(db, context) {
        super(db, context);

    }

    getSchema() {
        return OrganisationConfig.schema.name;
    }

    getAll = () => {
        return super.getAll(OrganisationConfig.schema.name).map(_.identity).filter(this.unVoided);
    };

    getSettings() {
        const orgConfig = this.findOnly(OrganisationConfig.schema.name);
        return _.isEmpty(orgConfig) ? [] : orgConfig.getSettings();
    }

    displayGenderFilter() {
        const settings = this.getSettings();
        return _.isEmpty(settings) ? false : settings.displayGenderFilter;
    }

    getDashboardFilters() {
        return this.getSettings() && this.getSettings().myDashboardFilters || [];
    }

    getFilterNames() {
        return [...this.getDashboardFilterNames(), ...this.getSearchFilterNames()];
    }

    getDashboardFilterNames() {
        return this.getDashboardFilters().map(filter => filter.titleKey)
    }

    getSearchFilterNames() {
        return this.getSearchFilters().map(filter => filter.titleKey)
    }

    getSearchFilters() {
        return this.getSettings() && this.getSettings().searchFilters || [];
    }

    isSearchFiltersEmpty(filters) {
        return this.getSearchFilterNames().filter(title => !_.isEmpty(filters[title])).length === 0;
    }

    isDashboardFiltersEmpty(filters) {
        return this.getDashboardFilterNames().filter(title => !_.isEmpty(filters[title])).length === 0;
    }

    queryIndividuals(answerFilters, individualUUIDFilter) {
        return _.isEmpty(answerFilters) ? [] :
            [...this.db.objects(Individual.schema.name)
                .filtered(`voided = false `)
                .filtered((_.isEmpty(individualUUIDFilter) ? 'uuid != null' : `${individualUUIDFilter}`))
                .filtered(` ${answerFilters} `)
                .map(ind => ind.uuid)
            ];
    }

    // Note that the query is run for every filter(concept) separately, this is because we don't have
    // joins in realm and after getting latest from each filter(concept) we need to query for selected concept answer.
    queryFromLatestObservation(schemaName, conceptFilters, selectedAnswerFilters, scopeFilters, sortFilter, indFunc) {
        const latestEncounters = [...this.db.objects(schemaName)
            .filtered(`voided = false `)
            //limit the scope of query by giving encounter/program uuid
            .filtered(` ${scopeFilters} `)
            //filter encounters where concept answer is present
            .filtered(conceptFilters)
            //get the most latest encounter for an individual
            .filtered(` ${sortFilter} `)
        ];
        //cannot append next filtered to this query because sorting happens at the end of query and we will not get expected result.
        //so we get the most recent encounters from above query and pass it down to the next query.
        const latestEncounterFilters = latestEncounters.map(enc => `uuid=="${enc.uuid}"`).join(" OR ");
        return _.isEmpty(latestEncounters) ? [] : [...this.db.objects(schemaName)
        //get the latest encounters
            .filtered(` ${latestEncounterFilters} `)
            //check if selected filter is present in the observations
            .filtered(` ${selectedAnswerFilters('observations.valueJSON')} `)
            .map(indFunc)
        ];
    }

    createProgramEncounterScopeFilter(encounterOptions, programOptions) {
        return [_.isEmpty(encounterOptions) ? '' : `( ${encounterOptions} )`, _.isEmpty(programOptions) ? '' : `( ${programOptions} )`].filter(Boolean).join(" AND ");
    }

    applyCustomFilters(customFilters, filterType) {
        this.individualUUIDs = null;
        this.commonIndividualFilters = [];
        _.forEach(this.getSettings()[filterType], filter => {
            const selectedOptions = customFilters[filter.titleKey];
            if (!_.isEmpty(selectedOptions)) {
                const selectedAnswerFilters = (scope) => _.map(selectedOptions, c => `${scope} contains "${c.uuid}"`).join(" OR ");
                const {searchParameters, searchType, conceptUUID} = filter;
                const conceptFilter = `observations.concept.uuid == "${conceptUUID}"`;
                switch (searchType) {
                    case 'programEncounter' : {
                        const encounterOptions = _.map(searchParameters.encounterTypeUUIDs, e => `encounterType.uuid == "${e}"`).join(" OR ");
                        const programOptions = _.map(searchParameters.programUUIDs, p => `programEnrolment.program.uuid == "${p}"`).join(" OR ");
                        const scopeFilters = this.createProgramEncounterScopeFilter(encounterOptions, programOptions);
                        const scopeFiltersWithNonExit = `(${scopeFilters}) and programEnrolment.programExitDateTime = null`;
                        const sortFilter = 'TRUEPREDICATE sort(programEnrolment.individual.uuid asc , encounterDateTime desc) Distinct(programEnrolment.individual.uuid)';
                        const individualUUIDs = this.queryFromLatestObservation(ProgramEncounter.schema.name, conceptFilter, selectedAnswerFilters, scopeFiltersWithNonExit, sortFilter, enc => enc.programEnrolment.individual.uuid);
                        this.individualUUIDs = _.isNil(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
                        break;
                    }
                    case 'programEnrolment' : {
                        const programOptions = _.map(searchParameters.programUUIDs, p => `program.uuid == "${p}"`).join(" OR ");
                        const scopeFilters = this.createProgramEncounterScopeFilter(null, programOptions);
                        const scopeFiltersWithNonExit = `(${scopeFilters}) and programExitDateTime = null`;
                        const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , enrolmentDateTime desc) Distinct(individual.uuid)';
                        const individualUUIDs = this.queryFromLatestObservation(ProgramEnrolment.schema.name, conceptFilter, selectedAnswerFilters, scopeFiltersWithNonExit, sortFilter, enc => enc.individual.uuid);
                        this.individualUUIDs = _.isNil(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
                        break;
                    }
                    case 'registration' : {
                        this.commonIndividualFilters.push(`(${selectedAnswerFilters('observations.valueJSON')})`);
                        break;
                    }
                    case 'encounter' : {
                        const encounterOptions = _.map(searchParameters.encounterTypeUUIDs, e => `encounterType.uuid == "${e}"`).join(" OR ");
                        const scopeFilters = this.createProgramEncounterScopeFilter(encounterOptions, null);
                        const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , encounterDateTime desc) Distinct(individual.uuid)';
                        const individualUUIDs = this.queryFromLatestObservation(Encounter.schema.name, conceptFilter, selectedAnswerFilters, scopeFilters, sortFilter, enc => enc.individual.uuid);
                        this.individualUUIDs = _.isNil(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
                        break;
                    }
                    default :
                        General.logDebug("Scope not found")
                }
            }
        });
        const commonIndividualFilter = this.commonIndividualFilters.filter(Boolean).join(" AND ");
        if (_.isNil(this.individualUUIDs)) {
            return this.queryIndividuals(commonIndividualFilter)
        }
        const individualUuidFilter = _.map(this.individualUUIDs, i => `uuid == "${i}"`).join(" OR ");
        return _.isEmpty(this.individualUUIDs) ? [] :
            (_.isEmpty(commonIndividualFilter) ? this.individualUUIDs : this.queryIndividuals(commonIndividualFilter, individualUuidFilter))
    }
}

export default CustomFilterService;