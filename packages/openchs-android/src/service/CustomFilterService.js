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
import React from "react";
import moment from "moment";
import EntityService from "./EntityService";

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

    queryEntity(schemaName, selectedAnswerFilters, otherFilters, indFunc) {
        return [...this.db.objects(schemaName)
            .filtered(`voided = false `)
            .filtered(`${selectedAnswerFilters()}`)
            .filtered((_.isEmpty(otherFilters) ? 'uuid != null' : `${otherFilters}`))
            .map(indFunc)
        ];
    }

    // Note that the query is run for every filter(concept) separately, this is because we don't have
    // joins in realm and after getting latest from each filter(concept) we need to query for selected concept answer.
    queryFromLatestObservation(schemaName, conceptFilters, selectedAnswerFilters, scopeFilters, sortFilter, indFunc, widget, inMemoryFilter) {
        const latestEncounters = this.db.objects(schemaName)
            .filtered(`voided = false `)
            //limit the scope of query by giving encounter/program uuid
            .filtered(_.isEmpty(scopeFilters) ? 'uuid != null' : ` ${scopeFilters} `)
            //filter encounters where concept answer is present
            .filtered(_.isEmpty(conceptFilters) ? 'uuid != null' : conceptFilters)
            //get the most latest encounter for an individual
            .filtered(_.isEmpty(sortFilter) ? 'uuid != null' : ` ${sortFilter} `);

        return widget === CustomFilter.widget.Range ? this.filterForRangeWidgetType(latestEncounters, selectedAnswerFilters, indFunc)
            : this.filterForFixedWidgetType(latestEncounters, schemaName, selectedAnswerFilters, indFunc, inMemoryFilter);
    }

    filterForFixedWidgetType(latestEncounters, schemaName, selectedAnswerFilters, indFunc, inMemoryFilter) {
        //cannot append next filtered to this query because sorting happens at the end of query and we will not get expected result.
        //so we get the most recent encounters from above query and pass it down to the next query.
        if (_.isEmpty(latestEncounters)) return [];
        let encountersBasedOnSelectedAnswers = latestEncounters.filtered(` ${selectedAnswerFilters()} `);
        if (!_.isNil(inMemoryFilter)) {
            General.logDebug("CustomFilterService", "Running in memory filter");
            encountersBasedOnSelectedAnswers = encountersBasedOnSelectedAnswers.filterInternal((obsHolder) => inMemoryFilter(obsHolder))
        }
        return encountersBasedOnSelectedAnswers.map(indFunc);
    }

    filterForRangeWidgetType(latestEntities, selectedAnswerFilters, indFunc) {
        return _.filter(latestEntities, pe => _.some(pe.observations, obs => selectedAnswerFilters(obs)))
            .map(indFunc);
    }

    createProgramEncounterScopeFilter(encounterOptions, programOptions) {
        return [_.isEmpty(encounterOptions) ? '' : `( ${encounterOptions} )`, _.isEmpty(programOptions) ? '' : `( ${programOptions} )`].filter(Boolean).join(" AND ");
    }

    getFilterQueryByType({type, conceptUUID, widget}, selectedOptions) {
        if (type === CustomFilter.type.Concept) {
            const conceptService = this.getService(ConceptService);
            const concept = conceptService.getConceptByUUID(conceptUUID);
            return this.getConceptFilterQuery(concept, selectedOptions, widget)
        } else if (type === CustomFilter.type.RegistrationDate) {
            return this.otherDateFilter(selectedOptions, widget, 'registrationDate');
        } else if (type === CustomFilter.type.EnrolmentDate) {
            return this.otherDateFilter(selectedOptions, widget, 'enrolmentDateTime');
        } else if (type === CustomFilter.type.ProgramEncounterDate || type === CustomFilter.type.EncounterDate) {
            return this.otherDateFilter(selectedOptions, widget, 'encounterDateTime');
        } else if (type === CustomFilter.type.GroupSubject) {
            return this.groupSubjectQuery.bind(this, selectedOptions);
        } else {
            return () => 'uuid != null'
        }
    }

    groupSubjectQuery(selectedOptions) {
        return _.map(selectedOptions, ({groupSubjectUUID}) => ` (voided = false AND groupSubject.uuid = '${groupSubjectUUID}') `).join(" OR ");
    }

    otherDateFilter(selectedOptions, widget, queryColumn) {
        const {minValue, maxValue} = _.head(selectedOptions);
        const realmFormatDate = (value, time) => {
            const date = value || moment().format("YYYY-MM-DDTHH:mm:ss");
            return date.split('T')[0] + time;
        };
        if (widget === CustomFilter.widget.Range) {
            return () => ` ${queryColumn} >= ${realmFormatDate(minValue, '@00:00:00')} &&  ${queryColumn} <= ${realmFormatDate(maxValue, '@23:59:59')} `;
        } else {
            return () => ` ${queryColumn} == ${realmFormatDate(minValue, '@00:00:00')} `;
        }
    }

    getConceptFilterQuery(concept, selectedOptions, widget) {
        const selectedOption = _.head(selectedOptions);
        switch (concept.datatype) {
            case (Concept.dataType.Coded) :
                const codedFilterQuery = _.map(selectedOptions, c => ` (observations.concept.uuid == '${concept.uuid}' AND  observations.valueJSON CONTAINS[c] '${c.uuid}') `).join(" OR ");
                return () => codedFilterQuery;
            case (Concept.dataType.Text) :
            case (Concept.dataType.Notes) :
            case (Concept.dataType.Id) :
                const textFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND  ${this.tokenizedNameQuery(c.name)}) `).join(" OR ");
                return () => this.getObsSubQueryForQuery(textFilterQuery);
            case (Concept.dataType.Numeric) :
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && obs.getValue() >= selectedOption.minValue && obs.getValue() <= selectedOption.maxValue;
                } else {
                    const numericFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":${c.minValue}}') `).join(" OR ");
                    return () => this.getObsSubQueryForQuery(numericFilterQuery);
                }
            case (Concept.dataType.Date) :
            case (Concept.dataType.DateTime):
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue()).isBetween(selectedOption.minValue, selectedOption.maxValue, null, []);
                } else {
                    const dateFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND valueJSON CONTAINS[c] '"answer":"${c.minValue.replace('Z', '')}') `).join(" OR ");
                    return () => this.getObsSubQueryForQuery(dateFilterQuery);
                }
            case (Concept.dataType.Time):
                if (widget === CustomFilter.widget.Range) {
                    return (obs) => obs.concept.uuid === concept.uuid && moment(obs.getValue(), 'H:mma').isBetween(moment(selectedOption.minValue, 'h:mma'), moment(selectedOption.maxValue, 'h:mma'), null, []);
                } else {
                    const timeFilterQuery = _.map(selectedOptions, c => ` (concept.uuid == '${concept.uuid}' AND  valueJSON CONTAINS[c] '${c.minValue}') `).join(" OR ");
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

    queryConceptTypeFilters(scope, scopeParameters, selectedAnswerFilters, conceptFilter, widget, inMemoryFilter) {
        switch (scope) {
            case CustomFilter.scope.ProgramEncounter : {
                const encounterOptions = _.map(scopeParameters.encounterTypeUUIDs, e => `encounterType.uuid == "${e}"`).join(" OR ");
                const programOptions = _.map(scopeParameters.programUUIDs, p => `programEnrolment.program.uuid == "${p}"`).join(" OR ");
                const scopeFilters = this.createProgramEncounterScopeFilter(encounterOptions, programOptions);
                const scopeFiltersWithNonExit = `(${scopeFilters}) and programEnrolment.programExitDateTime = null`;
                const sortFilter = 'TRUEPREDICATE sort(programEnrolment.individual.uuid asc , encounterDateTime desc) Distinct(programEnrolment.individual.uuid)';
                const individualUUIDs = this.queryFromLatestObservation(ProgramEncounter.schema.name, conceptFilter, selectedAnswerFilters, scopeFiltersWithNonExit, sortFilter, enc => enc.programEnrolment.individual.uuid, widget, inMemoryFilter);
                this.updateIndividuals(individualUUIDs);
                break;
            }
            case CustomFilter.scope.ProgramEnrolment : {
                const programOptions = _.map(scopeParameters.programUUIDs, p => `program.uuid == "${p}"`).join(" OR ");
                const scopeFilters = this.createProgramEncounterScopeFilter(null, programOptions);
                const scopeFiltersWithNonExit = `(${scopeFilters}) and programExitDateTime = null`;
                const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , enrolmentDateTime desc) Distinct(individual.uuid)';
                const individualUUIDs = this.queryFromLatestObservation(ProgramEnrolment.schema.name, conceptFilter, selectedAnswerFilters, scopeFiltersWithNonExit, sortFilter, enl => enl.individual.uuid, widget, inMemoryFilter);
                this.updateIndividuals(individualUUIDs);
                break;
            }
            case CustomFilter.scope.Registration : {
                const individualUUIDs = this.queryFromLatestObservation(Individual.schema.name, null, selectedAnswerFilters, null, null, ind => ind.uuid, widget, inMemoryFilter);
                this.updateIndividuals(individualUUIDs);
                break;
            }
            case CustomFilter.scope.Encounter : {
                const encounterOptions = _.map(scopeParameters.encounterTypeUUIDs, e => `encounterType.uuid == "${e}"`).join(" OR ");
                const scopeFilters = this.createProgramEncounterScopeFilter(encounterOptions, null);
                const sortFilter = 'TRUEPREDICATE sort(individual.uuid asc , encounterDateTime desc) Distinct(individual.uuid)';
                const individualUUIDs = this.queryFromLatestObservation(Encounter.schema.name, conceptFilter, selectedAnswerFilters, scopeFilters, sortFilter, enc => enc.individual.uuid, widget, inMemoryFilter);
                this.updateIndividuals(individualUUIDs);
                break;
            }
            default :
                General.logDebug("Scope not found")
        }
    }

    updateIndividuals(individualUUIDs) {
        this.individualUUIDs = _.isNil(this.individualUUIDs) ? individualUUIDs : _.intersection(this.individualUUIDs, individualUUIDs);
    }

    applyCustomFilters(customFilters, filterName) {
        this.individualUUIDs = null;
        _.forEach(this.getSettings()[filterName], filter => {
            const selectedOptions = customFilters[filter.titleKey];
            if (!_.isEmpty(selectedOptions)) {
                const {scopeParameters, scope, conceptUUID, type, widget} = filter;
                const selectedAnswerFilterQuery = this.getFilterQueryByType(filter, selectedOptions);
                const conceptFilter = `observations.concept.uuid == "${conceptUUID}"`;
                switch (type) {
                    case CustomFilter.type.Concept :
                        const concept = this.getService(ConceptService).findByUUID(conceptUUID);
                        const inMemoryFilter = concept.isCodedConcept() ?
                            (obsHolder) => ObservationsHolder.hasAnyAnswer(obsHolder, conceptUUID, selectedOptions.map(x => x.uuid),) : null;
                        this.queryConceptTypeFilters(scope, scopeParameters, selectedAnswerFilterQuery, conceptFilter, widget, inMemoryFilter);
                        break;
                    case CustomFilter.type.RegistrationDate:
                        this.updateIndividuals(this.queryEntity(Individual.schema.name, selectedAnswerFilterQuery, null, ind => ind.uuid));
                        break;
                    case CustomFilter.type.EnrolmentDate:
                        const otherEnrolmentFilters = `individual.voided = false and programExitDateTime = null`;
                        this.updateIndividuals(this.queryEntity(ProgramEnrolment.schema.name, selectedAnswerFilterQuery, otherEnrolmentFilters, enl => enl.individual.uuid));
                        break;
                    case CustomFilter.type.ProgramEncounterDate:
                        const otherProgramEncounterFilters = `programEnrolment.individual.voided = false and programEnrolment.programExitDateTime = null and programEnrolment.voided = false`;
                        this.updateIndividuals(this.queryEntity(ProgramEncounter.schema.name, selectedAnswerFilterQuery, otherProgramEncounterFilters, enc => enc.programEnrolment.individual.uuid));
                        break;
                    case CustomFilter.type.EncounterDate:
                        const otherEncounterFilters = `individual.voided = false`;
                        this.updateIndividuals(this.queryEntity(Encounter.schema.name, selectedAnswerFilterQuery, otherEncounterFilters, enc => enc.individual.uuid));
                        break;
                    case CustomFilter.type.GroupSubject:
                        this.updateIndividuals(this.queryEntity(GroupSubject.schema.name, selectedAnswerFilterQuery, null, gs => gs.memberSubject.uuid));
                        break;
                    default :
                        General.logDebug("Filter type not found")
                }
            }
        });
        return this.individualUUIDs;
    }

    hideSearchButton() {
        const customSearchFilters = this.getSearchFilters();
        const totalSubjectCounts = this.getService(EntityService).findAllByCriteria('voided = false', Individual.schema.name).length;
        return _.isEmpty(customSearchFilters) && totalSubjectCounts < 5;
    }
}

export default CustomFilterService;
