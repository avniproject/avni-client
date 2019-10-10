import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Encounter, Individual, OrganisationConfig, ProgramEncounter} from "openchs-models";
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

    getDashboardFilters() {
        return this.getSettings() && this.getSettings().myDashboardFilters;
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
        return this.getSettings() && this.getSettings().searchFilters;
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

    queryEncounters(schemaName, searchParameters, selectedAnswerFilters, scopeFilters, sortFilter, indFunc) {
        this.encounterQueried = true;
        const latestEncounters = [...this.db.objects(schemaName)
            .filtered(`voided = false `)
            .filtered(` ${scopeFilters} `)
            .filtered(` ${sortFilter} `)];
        const latestEncounterFilters = latestEncounters.map(enc => `uuid=="${enc.uuid}"`).join(" OR ");
        return [...this.db.objects(schemaName)
            .filtered(`voided = false `)
            .filtered(` ${latestEncounterFilters} `)
            .filtered(` ${scopeFilters} `)
            .filtered(` ${selectedAnswerFilters('observations.valueJSON')} `)
            .map(indFunc)
        ];
    }

    applyCustomFilters(customFilters, filterType) {
        this.individualUUIDs = [];
        this.commonIndividualFilters = [];
        this.encounterQueried = false;
        _.forEach(this.getSettings()[filterType], filter => {
            const selectedOptions = customFilters[filter.titleKey];
            if (!_.isEmpty(selectedOptions)) {
                const selectedAnswerFilters = (scope) => _.map(selectedOptions, c => `${scope} contains "${c.uuid}"`).join(" OR ");
                const {searchParameters, searchType} = filter;
                switch (searchType) {
                    case 'programEncounter' : {
                        const encFilter = `encounterType.uuid == "${searchParameters.encounterTypeUUID}"`;
                        const scopeFilters = _.isNil(searchParameters.programUUID) ? encFilter : `${encFilter} AND programEnrolment.program.uuid == "${searchParameters.programUUID}"`;
                        const sortFilter = 'TRUEPREDICATE sort(programEnrolment.uuid asc , encounterDateTime desc) Distinct(programEnrolment.uuid)';
                        const individualUUIDs = this.queryEncounters(ProgramEncounter.schema.name, searchParameters, selectedAnswerFilters, scopeFilters, sortFilter, enc => enc.programEnrolment.individual.uuid);
                        this.individualUUIDs = _.isEmpty(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
                        break;
                    }
                    case 'programEnrolment' : {
                        this.commonIndividualFilters.push(`(SUBQUERY(enrolments, $enrolment, $enrolment.voided == false AND $enrolment.program.uuid == "${searchParameters.programUUID}" AND (${selectedAnswerFilters('$enrolment.observations.valueJSON')})).@count > 0)`);
                        break;
                    }
                    case 'registration' : {
                        this.commonIndividualFilters.push(`(${selectedAnswerFilters('observations.valueJSON')})`);
                        break;
                    }
                    case 'encounter' : {
                        const scopeFilters = `encounterType.uuid == "${searchParameters.encounterTypeUUID}"`;
                        const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , encounterDateTime desc) Distinct(individual.uuid)';
                        const individualUUIDs = this.queryEncounters(Encounter.schema.name, searchParameters, selectedAnswerFilters, scopeFilters, sortFilter, enc => enc.individual.uuid);
                        this.individualUUIDs = _.isEmpty(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
                        break;
                    }
                    default :
                        General.logDebug("Scope not found")
                }
            }
        });
        const commonIndividualFilter = this.commonIndividualFilters.filter(Boolean).join(" AND ");
        if (this.encounterQueried) {
            const individualUuidFilter = _.map(this.individualUUIDs, i => `uuid == "${i}"`).join(" OR ");
            return _.isEmpty(this.individualUUIDs) ? [] :
                (_.isEmpty(commonIndividualFilter) ? this.individualUUIDs : this.queryIndividuals(commonIndividualFilter, individualUuidFilter))
        }
        return this.queryIndividuals(commonIndividualFilter)
    }
}

export default CustomFilterService;