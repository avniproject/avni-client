import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Encounter, Individual, OrganisationConfig, ProgramEncounter, ProgramEnrolment} from "openchs-models";

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
        return this.findOnly(OrganisationConfig.schema.name).getSettings();
    }

    getDashboardFilters() {
        return this.getSettings() && this.getSettings().myDashboardFilters;
    }

    getFilterNames() {
        return this.getDashboardFilters().map(filter => filter.titleKey)
    }

    getSearchFilters() {
        return this.getSettings() && this.getSettings().searchFilters;
    }

    queryIndividuals(answerFilters) {
        const filteredAppliedIndividuals = _.isEmpty(answerFilters) ? [] :
            [...this.db.objects(Individual.schema.name)
                .filtered(`voided = false `)
                .filtered(` ${answerFilters} `)
                .map(ind => ind.uuid)
            ];

        return filteredAppliedIndividuals;
    }

    applyCustomFilters(customFilters, filterType) {
        this.individualUUIDs = [];
        this.commonIndividualFilters = [];

        _.forEach(this.getSettings()[filterType], filter => {
            const selectedOptions = customFilters[filter.titleKey];
            if (!_.isEmpty(selectedOptions)) {
                const selectedAnswerUUID = _.map(selectedOptions, c => c.uuid);
                const selectedAnswerFilters = (scope) => _.map(selectedOptions, c => `${scope} contains "${c.uuid}"`).join(" OR ");
                const {searchParameters, searchType} = filter;
                switch (searchType) {
                    case 'programEncounter' : {
                        const encFilter = `encounterType.uuid == "${searchParameters.encounterTypeUUID}"`;
                        const scopeFilters = _.isNil(searchParameters.programUUID) ? encFilter : `${encFilter} AND programEnrolment.program.uuid == "${searchParameters.programUUID}"`;
                        const latestEncounters = [...this.db.objects(ProgramEncounter.schema.name)
                            .filtered(`voided = false `)
                            .filtered(` ${scopeFilters} `)
                            .filtered(` TRUEPREDICATE sort(programEnrolment.uuid asc , encounterDateTime desc) Distinct(programEnrolment.uuid) `)];
                        const latestEncounterFilters = latestEncounters.map(enc => `uuid=="${enc.uuid}"`).join(" OR ");
                        const individualUUIDs = [...this.db.objects(ProgramEncounter.schema.name)
                            .filtered(`voided = false `)
                            .filtered(` ${latestEncounterFilters} `)
                            .filtered(` ${scopeFilters} `)
                            .filtered(` ${selectedAnswerFilters('observations.valueJSON')} `)
                            .map(enc => enc.programEnrolment.individual.uuid)
                        ];

                        //console.log("individualUUIDs =>>", individualUUIDs);
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
                        const latestEncounters = [...this.db.objects(Encounter.schema.name)
                            .filtered(`voided = false `)
                            .filtered(` ${scopeFilters} `)
                            .filtered(`TRUEPREDICATE sort(individual.uuid asc , encounterDateTime desc) Distinct(individual.uuid)`)];
                        const latestEncounterFilters = latestEncounters.map(enc => `uuid=="${enc.uuid}"`).join(" OR ");
                        const individualUUIDs = [...this.db.objects(Encounter.schema.name)
                            .filtered(`voided = false `)
                            .filtered(` ${latestEncounterFilters} `)
                            .filtered(` ${scopeFilters} `)
                            .filtered(` ${selectedAnswerFilters('observations.valueJSON')} `)
                            .map(enc => enc.individual.uuid)
                        ];

                        //console.log("individualUUIDs =>>", individualUUIDs);
                        this.individualUUIDs = _.isEmpty(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
                        break;
                    }
                    default :
                        console.log("Scope not found")
                }
            }
        });
        const individuals = this.queryIndividuals(this.commonIndividualFilters.filter(Boolean).join(" AND "));
        const commonIndividuals = _.isEmpty(this.individualUUIDs) ? individuals : _.intersection(this.individualUUIDs, individuals);
        console.log("individuals = >>", commonIndividuals);
        return commonIndividuals;
    }
}

export default CustomFilterService;