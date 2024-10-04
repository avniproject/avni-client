import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {
    Encounter,
    Individual,
    OrganisationConfig,
    ProgramEncounter,
    ProgramEnrolment,
    Concept,
    CustomFilter,
    GroupSubject,
    ObservationsHolder
} from "openchs-models";
import General from "../utility/General";
import _ from "lodash";
import ConceptService from "./ConceptService";
import moment from "moment";
import RealmQueryService from "./query/RealmQueryService";

function getDateFilterFunction(filterValue, widget, queryColumn) {
    if (widget === CustomFilter.widget.Range) {
        const {minValue, maxValue} = filterValue;
        return () => ` ${queryColumn} >= ${RealmQueryService.toMidnight(minValue)} &&  ${queryColumn} <= ${RealmQueryService.toMidnight(maxValue)} `;
    } else {
        return () => ` ${queryColumn} == ${RealmQueryService.toMidnight(filterValue)} `;
    }
}

function noQueryResultFunction() {
    return "";
}

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

    getSearchFilterBySubjectType(subjectTypeUUID) {
        return this.getSearchFilters().filter(f => f.subjectTypeUUID === subjectTypeUUID) || [];
    }

    isSearchFiltersEmpty(filters) {
        return this.getSearchFilterNames().filter(title => !_.isEmpty(filters[title])).length === 0;
    }

    isDashboardFiltersEmpty(filters) {
        return this.getDashboardFilterNames().filter(title => !_.isEmpty(filters[title])).length === 0;
    }

    getFiltersByType(filterName, type) {
        return _.filter(this.getSettings()[filterName], filter => filter.type === type)
    }

    filterTypePresent(filterName, type, subjectTypeUUID) {
        return !_.isEmpty(_.filter(this.getFiltersByType(filterName, type), f => f.subjectTypeUUID === subjectTypeUUID));
    }

    errorNotPresent(filters, subjectTypeUUID) {
        const filterWithError = _.filter(_.values(filters), filterArray => !_.isEmpty(_.filter(filterArray, f => f.subjectTypeUUID === subjectTypeUUID && !_.isEmpty(f.validationError))));
        return _.isEmpty(filterWithError);
    }

    getNonCodedConceptFilters(filterName, subjectTypeUUID) {
        const conceptService = this.getService(ConceptService);
        return this.getFiltersByType(filterName, CustomFilter.type.Concept)
            .filter(filter => conceptService.getConceptByUUID(filter.conceptUUID).datatype !== Concept.dataType.Coded
                && filter.subjectTypeUUID === subjectTypeUUID);
    }

    getTopLevelFilters(filterName, subjectTypeUUID) {
        const {Concept, RegistrationDate, EnrolmentDate, ProgramEncounterDate, EncounterDate, GroupSubject} = CustomFilter.type;
        const filterOrder = [RegistrationDate, EnrolmentDate, ProgramEncounterDate, EncounterDate, Concept];
        const nonConceptFilters = _.filter(this.getSettings()[filterName], filter => !_.includes([Concept, GroupSubject], filter.type) && filter.subjectTypeUUID === subjectTypeUUID);
        return _.sortBy([...this.getNonCodedConceptFilters(filterName, subjectTypeUUID), ...nonConceptFilters], (f) => _.indexOf(filterOrder, f.type))
    }

    getCodedOrGroupSubjectFilters(filterName) {
        return _.filter(this.getSettings()[filterName], filter => _.includes([CustomFilter.type.Concept, CustomFilter.type.GroupSubject], filter.type));
    }

    getBottomLevelFilters(filterName, subjectTypeUUID) {
        const conceptService = this.getService(ConceptService);
        return this.getCodedOrGroupSubjectFilters(filterName)
            .filter(filter => (filter.type === CustomFilter.type.GroupSubject || conceptService.getConceptByUUID(filter.conceptUUID).datatype === Concept.dataType.Coded)
                && filter.subjectTypeUUID === subjectTypeUUID);
    }

    queryEntity(schemaName, selectedAnswerQueryFunction, otherFilters, indFunc, includeVoided) {
        const query = selectedAnswerQueryFunction();

        let results = this.db.objects(schemaName);
        if (includeVoided)
            results = results.filtered("voided = false");
        if (!_.isEmpty(query))
            results = results.filtered(query);
        if (!_.isEmpty(otherFilters))
            results = results.filtered(otherFilters);

        return [...results.map(indFunc)];
    }

    // Note that the query is run for every filter(concept) separately, this is because we don't have
    // joins in realm and after getting latest from each filter(concept) we need to query for selected concept answer.
    queryFromLatestObservation(schemaName, conceptFilters, selectedAnswerFilterFunction, scopeFilters, sortFilter, indFunc, widget, inMemoryFilter, includeVoided) {
        const latestEncounters = this.db.objects(schemaName)
            .filtered(includeVoided ? `uuid != null ` : `voided = false `)
            //limit the scope of query by giving encounter/program uuid
            .filtered(_.isEmpty(scopeFilters) ? 'uuid != null' : ` ${scopeFilters} `)
            //filter encounters where concept answer is present
            .filtered(_.isEmpty(conceptFilters) ? 'uuid != null' : conceptFilters)
            //get the most latest encounter for an individual
            .filtered(_.isEmpty(sortFilter) ? 'uuid != null' : ` ${sortFilter} `);

        return widget === CustomFilter.widget.Range ? this.filterForRangeWidgetType(latestEncounters, selectedAnswerFilterFunction, indFunc)
            : this.filterForNonRangeWidgetType(latestEncounters, schemaName, selectedAnswerFilterFunction, indFunc, inMemoryFilter);
    }

    filterForNonRangeWidgetType(latestEncounters, schemaName, selectedAnswerFiltersFunction, indFunc, inMemoryFilter) {
        //cannot append next filtered to this query because sorting happens at the end of query and we will not get expected result.
        //so we get the most recent encounters from above query and pass it down to the next query.
        if (_.isEmpty(latestEncounters) || _.isEmpty(selectedAnswerFiltersFunction())) return [];

        let encountersBasedOnSelectedAnswers = latestEncounters.filtered(` ${selectedAnswerFiltersFunction()} `);
        if (!_.isNil(inMemoryFilter)) {
            General.logDebug("CustomFilterService", "Running in memory filter");
            encountersBasedOnSelectedAnswers = encountersBasedOnSelectedAnswers.filterInternal((obsHolder) => inMemoryFilter(obsHolder))
        }
        return encountersBasedOnSelectedAnswers.map(indFunc);
    }

    filterForRangeWidgetType(latestEntities, selectedAnswerFilterFunction, indFunc) {
        return _.filter(latestEntities, pe => _.some(pe.observations, obs => selectedAnswerFilterFunction(obs)))
            .map(indFunc);
    }

    createProgramEncounterScopeFilter(encounterOptions, programOptions) {
        return [_.isEmpty(encounterOptions) ? '' : `( ${encounterOptions} )`, _.isEmpty(programOptions) ? '' : `( ${programOptions} )`].filter(Boolean).join(" AND ");
    }

    //Delete with MyDashboard
    getFilterQueryByTypeFunction({type, conceptUUID, widget}, selectedOptions) {
        if (type === CustomFilter.type.Concept) {
            const conceptService = this.getService(ConceptService);
            const concept = conceptService.getConceptByUUID(conceptUUID);
            return this.getConceptFilterQueryFunction(concept, selectedOptions, widget)
        } else if (type === CustomFilter.type.RegistrationDate) {
            return RealmQueryService.getDateFilterFunctionV1(selectedOptions, widget, 'registrationDate');
        } else if (type === CustomFilter.type.EnrolmentDate) {
            return RealmQueryService.getDateFilterFunctionV1(selectedOptions, widget, 'enrolmentDateTime');
        } else if (type === CustomFilter.type.ProgramEncounterDate || type === CustomFilter.type.EncounterDate) {
            return RealmQueryService.getDateFilterFunctionV1(selectedOptions, widget, 'encounterDateTime');
        } else if (type === CustomFilter.type.GroupSubject) {
            return this.groupSubjectQuery.bind(this, selectedOptions);
        } else {
            return () => 'uuid != null'
        }
    }

    getFilterQueryByTypeFunctionV2({type, conceptUUID, widget}, filterValue) {
        if (type === CustomFilter.type.Concept) {
            const conceptService = this.getService(ConceptService);
            const concept = conceptService.getConceptByUUID(conceptUUID);
            return this.getConceptFilterQueryFunctionV2(concept, filterValue, widget)
        } else if (type === CustomFilter.type.RegistrationDate) {
            return getDateFilterFunction(filterValue, widget, 'registrationDate');
        } else if (type === CustomFilter.type.EnrolmentDate) {
            return getDateFilterFunction(filterValue, widget, 'enrolmentDateTime');
        } else if (type === CustomFilter.type.ProgramEncounterDate || type === CustomFilter.type.EncounterDate) {
            return getDateFilterFunction(filterValue, widget, 'encounterDateTime');
        } else if (type === CustomFilter.type.GroupSubject) {
            return this.groupSubjectQuery.bind(this, filterValue);
        } else {
            return RealmQueryService.getMatchAllEntitiesQuery;
        }
    }

    groupSubjectQuery(selectedGroupSubjects) {
        return _.map(selectedGroupSubjects, (selectedGroupSubject) => ` (voided = false AND groupSubject.uuid = '${selectedGroupSubject.uuid}') `).join(" OR ");
    }

    getConceptFilterQueryFunction(concept, selectedOptions, widget) {
        const selectedOption = _.head(selectedOptions);
        switch (concept.datatype) {
            case (Concept.dataType.Coded) :
                const codedFilterQuery = _.map(selectedOptions, c => ` (observations.concept.uuid == '${concept.uuid}' AND  observations.valueJSON CONTAINS[c] '${c.uuid}') `).join(" OR ");
                return () => codedFilterQuery;
            case (Concept.dataType.Text) :
            case (Concept.dataType.Notes) :
            case (Concept.dataType.Id) :
                const textFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND  ${this.tokenizedNameQuery(c.name)}) `).join(" OR ");
                return selectedOptions.length === 0 ? noQueryResultFunction : () => this.getObsSubQueryForQuery(textFilterQuery);
            case (Concept.dataType.Numeric) :
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && obs.getValue() >= selectedOption.minValue && obs.getValue() <= selectedOption.maxValue;
                } else {
                    const numericFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":${c.minValue}}') `).join(" OR ");
                    return selectedOptions.length === 0 ? noQueryResultFunction : () => this.getObsSubQueryForQuery(numericFilterQuery);
                }
            case (Concept.dataType.Date) :
            case (Concept.dataType.DateTime):
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue()).isBetween(selectedOption.minValue, selectedOption.maxValue, null, []);
                } else {
                    const dateFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":"${c.minValue.replace('Z', '')}') `).join(" OR ");
                    return selectedOptions.length === 0 ? noQueryResultFunction : () => this.getObsSubQueryForQuery(dateFilterQuery);
                }
            case (Concept.dataType.Time):
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue(), 'H:mma').isBetween(moment(selectedOption.minValue, 'h:mma'), moment(selectedOption.maxValue, 'h:mma'), null, []);
                } else {
                    const timeFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND  valueJSON CONTAINS[c] '${c.minValue}') `).join(" OR ");
                    return selectedOptions.length === 0 ? noQueryResultFunction : () => this.getObsSubQueryForQuery(timeFilterQuery);
                }
            default:
                return () => 'uuid != null';
        }
    }

    getConceptFilterQueryFunctionV2(concept, filterValue, widget) {
        switch (concept.datatype) {
            case (Concept.dataType.Coded) :
                const codedFilterQuery = _.map(filterValue, c => ` (observations.concept.uuid == '${concept.uuid}' AND  observations.valueJSON CONTAINS[c] '${c.uuid}') `).join(" OR ");
                return () => codedFilterQuery;
            case (Concept.dataType.Text) :
            case (Concept.dataType.Notes) :
            case (Concept.dataType.Id) :
                const textFilterQuery = ` (concept.uuid == '${concept.uuid}' AND  ${this.tokenizedNameQuery(filterValue)}) `;
                return () => this.getObsSubQueryForQuery(textFilterQuery);
            case (Concept.dataType.Numeric) :
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && obs.getValue() >= filterValue.minValue && obs.getValue() <= filterValue.maxValue;
                } else {
                    const numericFilterQuery = ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":${filterValue}') `;
                    return () => this.getObsSubQueryForQuery(numericFilterQuery);
                }
            case (Concept.dataType.Date) :
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue()).isBetween(filterValue.minValue, filterValue.maxValue, null, []);
                } else {
                    const dateFilterQuery = ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":"${RealmQueryService.getDateForStringLikeMatching(filterValue)}') `;
                    return () => this.getObsSubQueryForQuery(dateFilterQuery);
                }
            case (Concept.dataType.DateTime):
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue()).isBetween(filterValue.minValue, filterValue.maxValue, null, []);
                } else {
                    const dateFilterQuery = ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":"${RealmQueryService.getDateTimeForStringLikeMatching(filterValue)}') `;
                    return () => this.getObsSubQueryForQuery(dateFilterQuery);
                }
            case (Concept.dataType.Time):
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue(), 'H:mma').isBetween(moment(filterValue.minValue, 'h:mma'), moment(filterValue.maxValue, 'h:mma'), null, []);
                } else {
                    const timeFilterQuery = ` (concept.uuid == '${concept.uuid}' AND  valueJSON CONTAINS[c] '${filterValue}') `;
                    return () => this.getObsSubQueryForQuery(timeFilterQuery);
                }
            default:
                return () => 'uuid != null';
        }
    }

    getObsSubQueryForQuery(query) {
        return `SUBQUERY(observations, $concept, ${query} ).@count > 0`;
    }

    tokenizedNameQuery(name) {
        const filter = [];
        _.chain(name)
            .split(' ')
            .map((token) => token.trim()).filter((token) => !_.isEmpty(token))
            .forEach((token) => {
                filter.push(`valueJSON CONTAINS[c] "${token}"`)
            }).value();
        return filter.join(" AND ");
    }

    queryConceptTypeFilters(scope, scopeParameters, selectedAnswerFilterFunction, conceptFilter, widget, inMemoryFilter, includeVoided) {
        switch (scope) {
            case CustomFilter.scope.ProgramEncounter : {
                const encounterOptions = _.map(scopeParameters.encounterTypeUUIDs, e => `encounterType.uuid == "${e}"`).join(" OR ");
                const programOptions = _.map(scopeParameters.programUUIDs, p => `programEnrolment.program.uuid == "${p}"`).join(" OR ");
                const scopeFilters = this.createProgramEncounterScopeFilter(encounterOptions, programOptions);
                const scopeFiltersWithNonExit = `(${scopeFilters}) and programEnrolment.programExitDateTime = null`;
                const sortFilter = 'TRUEPREDICATE sort(programEnrolment.individual.uuid asc , encounterDateTime desc) Distinct(programEnrolment.individual.uuid)';
                return this.queryFromLatestObservation(ProgramEncounter.schema.name, conceptFilter, selectedAnswerFilterFunction, scopeFiltersWithNonExit, sortFilter, enc => enc.programEnrolment.individual.uuid, widget, inMemoryFilter, includeVoided);
            }
            case CustomFilter.scope.ProgramEnrolment : {
                const programOptions = _.map(scopeParameters.programUUIDs, p => `program.uuid == "${p}"`).join(" OR ");
                const scopeFilters = this.createProgramEncounterScopeFilter(null, programOptions);
                const scopeFiltersWithNonExit = `(${scopeFilters}) and programExitDateTime = null`;
                const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , enrolmentDateTime desc) Distinct(individual.uuid)';
                return this.queryFromLatestObservation(ProgramEnrolment.schema.name, conceptFilter, selectedAnswerFilterFunction, scopeFiltersWithNonExit, sortFilter, enl => enl.individual.uuid, widget, inMemoryFilter, includeVoided);
            }
            case CustomFilter.scope.Registration : {
                return this.queryFromLatestObservation(Individual.schema.name, null, selectedAnswerFilterFunction, null, null, ind => ind.uuid, widget, inMemoryFilter, includeVoided);
            }
            case CustomFilter.scope.Encounter : {
                const encounterOptions = _.map(scopeParameters.encounterTypeUUIDs, e => `encounterType.uuid == "${e}"`).join(" OR ");
                const scopeFilters = this.createProgramEncounterScopeFilter(encounterOptions, null);
                const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , encounterDateTime desc) Distinct(individual.uuid)';
                return this.queryFromLatestObservation(Encounter.schema.name, conceptFilter, selectedAnswerFilterFunction, scopeFilters, sortFilter, enc => enc.individual.uuid, widget, inMemoryFilter, includeVoided);
            }
            default :
                General.logDebug("Scope not found");
                return [];
        }
    }

    getSubjects(conceptUUID, selectedOptions, type, scope, scopeParameters, widget, queryFunction, includeVoided = false) {
        switch (type) {
            case CustomFilter.type.Concept :
                const concept = this.getService(ConceptService).findByUUID(conceptUUID);
                const inMemoryFilter = concept.isCodedConcept() ?
                    (obsHolder) => ObservationsHolder.hasAnyAnswer(obsHolder, conceptUUID, selectedOptions.map(x => x.uuid),) : null;
                const conceptFilter = `observations.concept.uuid == "${conceptUUID}"`;
                return this.queryConceptTypeFilters(scope, scopeParameters, queryFunction, conceptFilter, widget, inMemoryFilter, includeVoided);
            case CustomFilter.type.RegistrationDate:
                return this.queryEntity(Individual.schema.name, queryFunction, null, ind => ind.uuid, includeVoided);
            case CustomFilter.type.EnrolmentDate:
                const otherEnrolmentFilters = `individual.voided = false and programExitDateTime = null`;
                return this.queryEntity(ProgramEnrolment.schema.name, queryFunction, otherEnrolmentFilters, enl => enl.individual.uuid, includeVoided);
            case CustomFilter.type.ProgramEncounterDate:
                const otherProgramEncounterFilters = `programEnrolment.individual.voided = false and programEnrolment.programExitDateTime = null and programEnrolment.voided = false`;
                return this.queryEntity(ProgramEncounter.schema.name, queryFunction, otherProgramEncounterFilters, enc => enc.programEnrolment.individual.uuid, includeVoided);
            case CustomFilter.type.EncounterDate:
                const otherEncounterFilters = `individual.voided = false`;
                return this.queryEntity(Encounter.schema.name, queryFunction, otherEncounterFilters, enc => enc.individual.uuid, includeVoided);
            case CustomFilter.type.GroupSubject:
                return this.queryEntity(GroupSubject.schema.name, queryFunction, null, gs => gs.memberSubject.uuid, includeVoided);
            default :
                General.logDebug("Filter type not found", type);
                return [];
        }
    }

    applyCustomFilters(customFilters, filterName, includeVoided = false) {
        let uniqueSubjectUUIDs = [];
        _.forEach(this.getSettings()[filterName], filter => {
            const selectedOptions = customFilters[filter.titleKey];
            const {scopeParameters, scope, conceptUUID, type, widget} = filter;
            const selectedAnswerFilterQueryFunction = this.getFilterQueryByTypeFunction(filter, selectedOptions);
            const subjects = this.getSubjects(conceptUUID, selectedOptions, type, scope, scopeParameters, widget, selectedAnswerFilterQueryFunction, includeVoided);
            const filterHasValue = !_.isEmpty(selectedOptions) && !_.isNil(selectedOptions)
            if (!filterHasValue || _.isEmpty(uniqueSubjectUUIDs)) {
                uniqueSubjectUUIDs = subjects;
            } else {
                uniqueSubjectUUIDs = _.intersection(uniqueSubjectUUIDs, subjects);
            }
        });
        return uniqueSubjectUUIDs;
    }
}

export default CustomFilterService;
