import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {
    CustomFilter,
    Duration,
    Encounter,
    EntityQueue,
    getUnderlyingRealmCollection,
    Individual,
    KeyValue,
    ObservationsHolder,
    Privilege,
    ProgramEncounter,
    ProgramEnrolment
} from "openchs-models";
import _ from 'lodash';
import moment from 'moment';
import MediaQueueService from "./MediaQueueService";
import IdentifierAssignmentService from "./IdentifierAssignmentService";
import FormMappingService from "./FormMappingService";
import RuleEvaluationService from "./RuleEvaluationService";
import General from "../utility/General";
import Colors from "../views/primitives/Colors";
import EncounterService from "./EncounterService";
import PrivilegeService from "./PrivilegeService";
import EntityApprovalStatusService from "./EntityApprovalStatusService";
import GroupSubjectService from "./GroupSubjectService";
import OrganisationConfigService from './OrganisationConfigService';
import RealmQueryService from "./query/RealmQueryService";
import {DashboardReportFilter} from "../model/DashboardReportFilter";
import CustomFilterService from "./CustomFilterService";

function uniqSubjectWithVisitName(individualsWithVisits, individualWithVisit) {
    const permissionAllowed = individualWithVisit.visitInfo.allow;
    if (individualsWithVisits.has(individualWithVisit.individual.uuid)) {
        const prevDate = individualsWithVisits.get(individualWithVisit.individual.uuid).visitInfo.sortingBy;
        const smallerDate = moment(prevDate).isBefore(individualWithVisit.visitInfo.sortingBy) ? prevDate : individualWithVisit.visitInfo.sortingBy;
        const presentEntry = individualWithVisit.visitInfo.visitName;
        const previousEntries = individualsWithVisits.get(individualWithVisit.individual.uuid).visitInfo.visitName;
        individualsWithVisits.set(individualWithVisit.individual.uuid,
            {
                individual: individualWithVisit.individual,
                visitInfo: {
                    uuid: individualWithVisit.individual.uuid,
                    visitName: permissionAllowed ? [...previousEntries, ...presentEntry] : previousEntries,
                    groupingBy: smallerDate && General.formatDate(smallerDate) || '',
                    sortingBy: smallerDate,
                }
            })
    } else {
        permissionAllowed && individualsWithVisits.set(individualWithVisit.individual.uuid, individualWithVisit);
    }
    return individualsWithVisits;
}

function filterSubjects(subjects, subjectCriteria, reportFilters, customFilterService) {
    subjects = applyConfiguredFilters(subjects, subjectCriteria);
    subjects = applyUserFilters(subjects, reportFilters, Individual.schema.name, customFilterService);

    const returnSubjects = subjects.map((subject) => {
        const registrationDate = subject.registrationDate;
        return {
            individual: subject,
            visitInfo: {
                uuid: subject.uuid,
                visitName: [],
                groupingBy: General.formatDate(registrationDate),
                sortingBy: registrationDate,
                allow: true,
            }
        };
    });
    return [...returnSubjects
        .reduce(uniqSubjectWithVisitName, new Map())
        .values()]
        .map(_.identity);
}

function getDateRange(date, duration) {
    const fromDate = moment(date).subtract(duration.durationValue, duration.durationUnit).startOf('day').toDate();
    const tillDate = moment(date).endOf('day').toDate();
    return {fromDate, tillDate};
}

function get24HoursDateRange(date) {
    const dateMidnight = moment(date).endOf('day').toDate();
    const dateMorning = moment(date).startOf('day').toDate();
    return {dateMidnight, dateMorning};
}

function getSubjectUUIDsForCustomFilters(customFilterService, reportFilters, entityService) {
    let uniqueSubjects = [];
    let filterApplied = false;
    reportFilters.forEach((filter) => {
        General.logDebug("IndividualService", `Filtering by ${filter.toDisplayText()}.`, "Filter value", filter.filterValue);
        let scope, conceptUUID, scopeParameters;
        switch (filter.type) {
            case CustomFilter.type.Concept:
                scope = filter.getScope(reportFilters);
                conceptUUID = filter.getConceptUUID();
                scopeParameters = filter.getScopeParameters();
            case CustomFilter.type.RegistrationDate:
            case CustomFilter.type.EnrolmentDate:
            case CustomFilter.type.ProgramEncounterDate:
            case CustomFilter.type.EncounterDate:
            case CustomFilter.type.GroupSubject:
                filterApplied = true;
                const filterQueryByTypeFunction = customFilterService.getFilterQueryByTypeFunctionV2({
                    type: filter.type,
                    widget: filter.dataType,
                    conceptUUID: conceptUUID
                }, filter.filterValue);
                const subjects = customFilterService.getSubjects(conceptUUID, filter.filterValue, filter.type, scope, scopeParameters, filter.dataType, filterQueryByTypeFunction, false);
                if (_.isEmpty(uniqueSubjects)) {
                    uniqueSubjects = subjects;
                } else {
                    uniqueSubjects = _.intersection(subjects, uniqueSubjects);
                }
                General.logDebug("IndividualService", `Filtered by ${filter.toDisplayText()}. Matching subjects: ${subjects.length}.`);
                break;
            default:
                break;
        }
    });
    return {uniqueSubjects, filterApplied};
}

function applyConfiguredFilters(entities, criteria) {
    let filteredEntities = entities;
    if (!_.isEmpty(criteria)) {
        General.logDebug("IndividualService", "Configured filter", criteria);
        filteredEntities = filteredEntities.filtered(criteria);
    }
    return filteredEntities;
}

const subjectUuidQueries = {
    [ProgramEncounter.schema.name]: "programEnrolment.individual.uuid",
    [Encounter.schema.name]: "individual.uuid",
    [ProgramEnrolment.schema.name]: "individual.uuid",
    [Individual.schema.name]: "uuid"
};

function applyUserFilters(entities, reportFilters, schema, customFilterService) {
    const addressFilter = DashboardReportFilter.getAddressFilter(reportFilters);
    const genders = DashboardReportFilter.getGenderFilterValues(reportFilters);

    const {uniqueSubjects, filterApplied} = getSubjectUUIDsForCustomFilters(customFilterService, reportFilters);
    General.logDebug("IndividualService", `uniqueSubjects: ${uniqueSubjects.length}, filterApplied: ${filterApplied}`);

    let filteredEntities = entities;
    filteredEntities = RealmQueryService.filterBasedOnAddress(schema, filteredEntities, addressFilter);
    filteredEntities = RealmQueryService.filterBasedOnGenders(schema, filteredEntities, genders);

    if (filterApplied) {
        if (uniqueSubjects.length > 0)
            filteredEntities = filteredEntities.filtered(RealmQueryService.orKeyValueQuery(subjectUuidQueries[schema], uniqueSubjects));
        else
        filteredEntities = filteredEntities.filtered('uuid = null');
    }
    return filteredEntities;
}

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.allCompletedVisitsIn = this.allCompletedVisitsIn.bind(this);
        this.allScheduledVisitsIn = this.allScheduledVisitsIn.bind(this);
        this.allOverdueVisitsIn = this.allOverdueVisitsIn.bind(this);
        this.recentlyRegistered = this.recentlyRegistered.bind(this);
        this.recentlyCompletedVisitsIn = this.recentlyCompletedVisitsIn.bind(this);
        this.recentlyEnrolled = this.recentlyEnrolled.bind(this);
        this.allIn = this.allIn.bind(this);
        this.dueChecklists = this.dueChecklists.bind(this);
    }

    getSchema() {
        return Individual.schema.name;
    }

    init() {
        this.encounterService = this.getService(EncounterService);
        this.entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        this.hideTotalForProgram = this.getService(OrganisationConfigService).hasHideTotalForProgram;
        this.showDueChecklistOnDashboard = this.getService(OrganisationConfigService).hasShowDueChecklistOnDashboard();
    }

    search(criteria, individualUUIDs) {
        const filterCriteria = criteria.getFilterCriteria();
        let searchResults, finalSearchResults = [];

        if (_.isEmpty(filterCriteria)) {
            searchResults = this.db.objects(Individual.schema.name).sorted("name");
            finalSearchResults = getUnderlyingRealmCollection(searchResults);
        } else {
            function filterIndividualsByChunks(baseResult) {
                // if chunkSize is less/more than 500, processing is slower
                const chunkSize = 500, noOfChunks = individualUUIDs.length / chunkSize;
                for (let chunk = 0; chunk < noOfChunks; chunk++) {
                    let individualUuidsChunk = _.slice(individualUUIDs, chunk * chunkSize, ((chunk + 1) * chunkSize) - 1);
                    let individualQuery = _.map(individualUuidsChunk, individualUUID => `uuid = "${individualUUID}"`).join(" OR ")
                    let searchResultsChunk = baseResult.filtered(individualQuery, ...individualUuidsChunk);
                    finalSearchResults = _.concat(finalSearchResults, searchResultsChunk.asArray());
                }
            }

            const baseResult = this.db
                .objects(Individual.schema.name)
                .filtered(
                    filterCriteria,
                    criteria.getMinDateOfBirth(),
                    criteria.getMaxDateOfBirth()
                ).sorted("name");

            if (_.isEmpty(individualUUIDs))
                finalSearchResults = getUnderlyingRealmCollection(baseResult);
            else {
                filterIndividualsByChunks(baseResult);
                finalSearchResults = _.orderBy(finalSearchResults, [individual => individual.name.toLowerCase()]);
            }
        }

        return finalSearchResults;
    }

    register(individual, nextScheduledVisits, skipCreatingPendingStatus, groupSubjectObservations) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(individual.observations);
        const formMappingService = this.getService(FormMappingService);
        const registrationForm = formMappingService.findRegistrationForm(individual.subjectType);
        const isApprovalEnabled = formMappingService.isApprovalEnabledForRegistrationForm(individual.subjectType);
        const isNew = this.isNew(individual);
        this.db.write(() => {
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                this.entityApprovalStatusService.createPendingStatus(individual, Individual.schema.name, db, individual.subjectType.uuid);
            individual.updateAudit(this.getUserInfo(), isNew);
            const saved = db.create(Individual.schema.name, individual, Realm.UpdateMode.Modified);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
            this.getService(MediaQueueService).addMediaToQueue(individual, Individual.schema.name);
            this.getService(IdentifierAssignmentService).assignPopulatedIdentifiersFromObservations(registrationForm, individual.observations, saved);
            _.forEach(groupSubjectObservations, this.getService(GroupSubjectService).addSubjectToGroup(saved, db));
            this.encounterService.saveScheduledVisits(saved, nextScheduledVisits, db, saved.registrationDate);
        });
    }

    updateObservations(individual) {
        const db = this.db;
        individual.updateAudit(this.getUserInfo(), false);
        this.db.write(() => {
            ObservationsHolder.convertObsForSave(individual.observations);
            db.create(Individual.schema.name, {
                uuid: individual.uuid,
                observations: individual.observations,
                profilePicture: individual.profilePicture
            }, Realm.UpdateMode.Modified);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
        });
    }

    eligiblePrograms(individualUUID) {
        const individual = this.findByUUID(individualUUID);
        const programs = this.getService(FormMappingService).findActiveProgramsForSubjectType(individual.subjectType);
        const nonEnrolledPrograms = individual.staticallyEligiblePrograms(programs);
        const ruleEvaluationService = this.getService(RuleEvaluationService);
        const enrolProgramCriteria = `privilege.name = '${Privilege.privilegeName.enrolSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}'`;
        const privilegeService = this.getService(PrivilegeService);

        const allowedEnrolmentTypeUuids = privilegeService.allowedEntityTypeUUIDListForCriteria(enrolProgramCriteria, 'programUuid');
        return _.filter(nonEnrolledPrograms, (program) => ruleEvaluationService.isEligibleForProgram(individual, program) && (privilegeService.hasAllPrivileges() || _.includes(allowedEnrolmentTypeUuids, program.uuid)));
    }

    _uniqIndividualsFrom(individuals, individual) {
        individuals.has(individual.uuid) || individuals.set(individual.uuid, individual);
        return individuals;
    }

    allInWithFilters(ignored, reportFilters, queryAdditions, programs = [], encounterTypes = []) {
        if (!this.hideTotalForProgram() || (_.isEmpty(programs) && _.isEmpty(encounterTypes))) {
            return this.allIn(ignored, reportFilters, queryAdditions);
        }
        return null;
    }

    allIn(ignored, reportFilters, queryAdditions) {
        const addressFilter = DashboardReportFilter.getAddressFilter(reportFilters);
        let individuals = this.db.objects(Individual.schema.name).filtered('voided = false ');
        if (!_.isEmpty(queryAdditions)) {
            individuals = individuals.filtered(queryAdditions);
        }
        individuals = RealmQueryService.filterBasedOnAddress(Individual.schema.name, individuals, addressFilter);
        return individuals.sorted('name');
    }

    allScheduledVisitsIn(date, reportFilters, programEncounterCriteria, encounterCriteria, queryProgramEncounter = true, queryGeneralEncounter = true) {
        const performProgramVisitCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}'`;
        const privilegeService = this.getService(PrivilegeService);
        const allowedProgramEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'programEncounterTypeUuid');
        const {dateMidnight, dateMorning} = get24HoursDateRange(date);

        let programEncounters = [];
        if (queryProgramEncounter) {
            programEncounters = this.db.objects(ProgramEncounter.schema.name)
                .filtered('earliestVisitDateTime <= $0 ' +
                    'AND maxVisitDateTime >= $1 ' +
                    'AND encounterDateTime = null ' +
                    'AND cancelDateTime = null ' +
                    'AND programEnrolment.programExitDateTime = null ' +
                    'AND programEnrolment.voided = false ' +
                    'AND programEnrolment.individual.voided = false ' +
                    'AND voided = false ',
                    dateMidnight,
                    dateMorning);

            programEncounters = applyConfiguredFilters(programEncounters, programEncounterCriteria);
            programEncounters = applyUserFilters(programEncounters, reportFilters, ProgramEncounter.schema.name, this.getService(CustomFilterService));

            programEncounters = programEncounters.map((enc) => {
                const individual = enc.programEnrolment.individual;
                const visitName = enc.name || enc.encounterType.operationalEncounterTypeName;
                const programName = enc.programEnrolment.program.operationalProgramName || enc.programEnrolment.program.name;
                const earliestVisitDateTime = enc.earliestVisitDateTime;
                return {
                    individual,
                    visitInfo: {
                        uuid: individual.uuid,
                        visitName: [{
                            visit: [programName, visitName, General.formatDate(earliestVisitDateTime)],
                            encounter: enc,
                            color: Colors.AccentColor,
                        }],
                        groupingBy: General.formatDate(earliestVisitDateTime),
                        sortingBy: earliestVisitDateTime,
                        allow: privilegeService.hasAllPrivileges() || _.includes(allowedProgramEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            });
        }

        const allowedGeneralEncounterTypeUuidsForPerformVisit = this.getService(PrivilegeService).allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'encounterTypeUuid');
        let encounters = [];
        if (queryGeneralEncounter) {
            encounters = this.db.objects(Encounter.schema.name)
                .filtered('earliestVisitDateTime <= $0 ' +
                    'AND maxVisitDateTime >= $1 ' +
                    'AND encounterDateTime = null ' +
                    'AND cancelDateTime = null ' +
                    'AND individual.voided = false ' +
                    'AND voided = false ',
                    dateMidnight,
                    dateMorning);

            encounters = applyConfiguredFilters(encounters, encounterCriteria);
            encounters = applyUserFilters(encounters, reportFilters, Encounter.schema.name, this.getService(CustomFilterService));

            encounters = encounters.map((enc) => {
                const individual = enc.individual;
                const visitName = enc.name || enc.encounterType.operationalEncounterTypeName;
                const earliestVisitDateTime = enc.earliestVisitDateTime;
                return {
                    individual,
                    visitInfo: {
                        uuid: individual.uuid,
                        visitName: [{
                            visit: [visitName, General.formatDate(earliestVisitDateTime)],
                            encounter: enc,
                            color: Colors.AccentColor,
                        }],
                        groupingBy: General.formatDate(earliestVisitDateTime),
                        sortingBy: earliestVisitDateTime,
                        allow: privilegeService.hasAllPrivileges() || _.includes(allowedGeneralEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            });
        }
        const allEncounters = [...
            [...programEncounters, ...encounters]
                .reduce(uniqSubjectWithVisitName, new Map())
                .values()
        ];
        return allEncounters;
    }

    allOverdueVisitsIn(date, reportFilters, programEncounterCriteria, encounterCriteria, queryProgramEncounter = true, queryGeneralEncounter = true) {
        const privilegeService = this.getService(PrivilegeService);
        const performProgramVisitCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}'`;
        const allowedProgramEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'programEncounterTypeUuid');
        const dateMorning = moment(date).startOf('day').toDate();

        let programEncounters = [];
        if (queryProgramEncounter) {
            programEncounters = this.db.objects(ProgramEncounter.schema.name)
                .filtered('maxVisitDateTime < $0 ' +
                    'AND cancelDateTime = null ' +
                    'AND encounterDateTime = null ' +
                    'AND programEnrolment.programExitDateTime = null ' +
                    'AND programEnrolment.voided = false ' +
                    'AND programEnrolment.individual.voided = false ' +
                    'AND voided = false ',
                    dateMorning);

            programEncounters = applyConfiguredFilters(programEncounters, programEncounterCriteria);
            programEncounters = applyUserFilters(programEncounters, reportFilters, ProgramEncounter.schema.name, this.getService(CustomFilterService));

            programEncounters = programEncounters.map((enc) => {
                const individual = enc.programEnrolment.individual;
                const visitName = enc.name || enc.encounterType.operationalEncounterTypeName;
                const programName = enc.programEnrolment.program.operationalProgramName || enc.programEnrolment.program.name;
                const maxVisitDateTime = enc.maxVisitDateTime;
                return {
                    individual,
                    visitInfo: {
                        uuid: individual.uuid,
                        visitName: [{
                            visit: [programName, visitName, General.formatDate(maxVisitDateTime)],
                            encounter: enc,
                            color: '#d0011b',
                        }],
                        groupingBy: General.formatDate(maxVisitDateTime),
                        sortingBy: maxVisitDateTime,
                        allow: privilegeService.hasAllPrivileges() || _.includes(allowedProgramEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            });
        }

        const allowedGeneralEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'encounterTypeUuid');
        let encounters = [];
        if (queryGeneralEncounter) {
            encounters = this.db.objects(Encounter.schema.name)
                .filtered('maxVisitDateTime < $0 ' +
                    'AND cancelDateTime = null ' +
                    'AND encounterDateTime = null ' +
                    'AND individual.voided = false ' +
                    'AND voided = false ',
                    dateMorning);

            encounters = applyConfiguredFilters(encounters, encounterCriteria);
            encounters = applyUserFilters(encounters, reportFilters, Encounter.schema.name, this.getService(CustomFilterService));

            encounters = encounters.map((enc) => {
                const individual = enc.individual;
                const visitName = enc.name || enc.encounterType.operationalEncounterTypeName;
                const maxVisitDateTime = enc.maxVisitDateTime;
                return {
                    individual,
                    visitInfo: {
                        uuid: individual.uuid,
                        visitName: [{
                            visit: [visitName, General.formatDate(maxVisitDateTime)],
                            encounter: enc,
                            color: '#d0011b',
                        }],
                        groupingBy: General.formatDate(maxVisitDateTime),
                        sortingBy: maxVisitDateTime,
                        allow: privilegeService.hasAllPrivileges() || _.includes(allowedGeneralEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            })
        }
        const allEncounters = [...
            [...programEncounters, ...encounters]
                .reduce(uniqSubjectWithVisitName, new Map())
                .values()
        ];
        return allEncounters;
    }

    allCompletedVisitsIn(date, queryAdditions) {
        const {dateMidnight, dateMorning} = get24HoursDateRange(date);
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('encounterDateTime <= $0 ' +
                'AND encounterDateTime >= $1 ',
                dateMidnight,
                dateMorning)
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .map((enc) => {
                return enc.programEnrolment.individual;
            })
            .reduce(this._uniqIndividualsFrom, new Map())
            .values()]
            .map(_.identity);
    }

    recentlyCompletedVisitsIn(date, reportFilters, programEncounterCriteria, encounterCriteria, queryProgramEncounter, queryGeneralEncounter, duration = new Duration(1, Duration.Day)) {
        const {fromDate, tillDate} = getDateRange(date, duration);

        let programEncounters = [];
        if (queryProgramEncounter) {
            programEncounters = this.db.objects(ProgramEncounter.schema.name)
                .filtered('voided = false ' +
                    'AND programEnrolment.voided = false ' +
                    'AND programEnrolment.individual.voided = false ' +
                    'AND encounterDateTime <= $0 ' +
                    'AND encounterDateTime >= $1 ',
                    tillDate,
                    fromDate);

            programEncounters = applyConfiguredFilters(programEncounters, programEncounterCriteria);
            programEncounters = applyUserFilters(programEncounters, reportFilters, ProgramEncounter.schema.name, this.getService(CustomFilterService));

            programEncounters = programEncounters.map((enc) => {
                const individual = enc.programEnrolment.individual;
                const encounterDateTime = enc.encounterDateTime;
                return {
                    individual,
                    visitInfo: {
                        uuid: individual.uuid,
                        visitName: [],
                        groupingBy: General.formatDate(encounterDateTime),
                        sortingBy: encounterDateTime,
                        allow: true,
                    }
                };
            });
        }

        let encounters = [];
        if (queryGeneralEncounter) {
            encounters = this.db.objects(Encounter.schema.name)
                .filtered('voided = false ' +
                    'AND individual.voided = false ' +
                    'AND encounterDateTime <= $0 ' +
                    'AND encounterDateTime >= $1 ',
                    tillDate,
                    fromDate);
            encounters = applyConfiguredFilters(encounters, encounterCriteria);
            encounters = applyUserFilters(encounters, reportFilters, Encounter.schema.name, this.getService(CustomFilterService));

            encounters = encounters.map((enc) => {
                const individual = enc.individual;
                const encounterDateTime = enc.encounterDateTime;
                return {
                    individual,
                    visitInfo: {
                        uuid: individual.uuid,
                        visitName: [],
                        groupingBy: General.formatDate(encounterDateTime),
                        sortingBy: encounterDateTime,
                        allow: true,
                    }
                };
            })
        }
        return [...[...programEncounters, ...encounters]
            .reduce(uniqSubjectWithVisitName, new Map())
            .values()]
            .map(_.identity);
    }

    recentlyRegistered(date, reportFilters, addressQuery, programs = [], encounterTypes = []) {
        const {fromDate, tillDate} = getDateRange(date, new Duration(1, Duration.Day));
        const addressFilter = DashboardReportFilter.getAddressFilter(reportFilters);

        let individuals = this.db.objects(Individual.schema.name)
            .filtered('voided = false ' +
                'AND registrationDate <= $0 ' +
                'AND registrationDate >= $1 ',
                tillDate,
                fromDate);
        if (!_.isEmpty(addressQuery)) {
            individuals = individuals.filtered(`${addressQuery}`);
        }
        individuals = RealmQueryService.filterBasedOnAddress(Individual.schema.name, individuals, addressFilter);
        individuals = individuals.map((individual) => individual);

        if (encounterTypes.length > 0 && programs.length > 0) {
            individuals = _.filter(individuals, (individual) => individual.hasProgramEncounterOfType(encounterTypes));
        } else if (encounterTypes.length > 0) {
            individuals = _.filter(individuals, (individual) => individual.hasEncounterOfType(encounterTypes));
        }
        individuals = individuals.map((individual) => {
            const registrationDate = individual.registrationDate;
            return {
                individual,
                visitInfo: {
                    uuid: individual.uuid,
                    visitName: [],
                    groupingBy: General.formatDate(registrationDate),
                    sortingBy: registrationDate,
                    allow: true,
                }
            };
        });
        return [...individuals
            .reduce(uniqSubjectWithVisitName, new Map())
            .values()]
            .map(_.identity);
    }

    allInV2(date, reportFilters, subjectCriteria) {
        let {dateMidnight} = get24HoursDateRange(date);
        let subjects = this.db.objects(Individual.schema.name)
            .filtered('voided = false AND registrationDate <= $0', dateMidnight);

        return filterSubjects(subjects, subjectCriteria, reportFilters, this.getService(CustomFilterService));
    }

    recentlyRegisteredV2(date, reportFilters, subjectCriteria, duration) {
        const {tillDate, fromDate} = getDateRange(date, duration);

        let subjects = this.db.objects(Individual.schema.name)
            .filtered('voided = false ' +
                'AND registrationDate <= $0 ' +
                'AND registrationDate >= $1 ',
                tillDate,
                fromDate);

        return filterSubjects(subjects, subjectCriteria, reportFilters, this.getService(CustomFilterService));
    }

    recentlyEnrolled(date, reportFilters = [], programEnrolmentCriteria = "", duration = new Duration(1, Duration.Day)) {
        const {fromDate, tillDate} = getDateRange(date, duration);

        General.logDebug("IndividualService", "recentlyEnrolled", "fromDate", fromDate, "tillDate", tillDate, programEnrolmentCriteria);

        let enrolments = this.db.objects(ProgramEnrolment.schema.name)
            .filtered('voided = false ' +
                'AND individual.voided = false ' +
                'AND enrolmentDateTime <= $0 ' +
                'AND enrolmentDateTime >= $1 ',
                tillDate,
                fromDate);

        enrolments = applyConfiguredFilters(enrolments, programEnrolmentCriteria);
        enrolments = applyUserFilters(enrolments, reportFilters, ProgramEnrolment.schema.name, this.getService(CustomFilterService));

        enrolments = enrolments.map((enc) => {
            const individual = enc.individual;
            const enrolmentDateTime = enc.enrolmentDateTime;
            return {
                individual,
                visitInfo: {
                    uuid: individual.uuid,
                    visitName: [],
                    groupingBy: General.formatDate(enrolmentDateTime),
                    sortingBy: enrolmentDateTime,
                    allow: true,
                }
            };
        });
        return [...enrolments
            .reduce(uniqSubjectWithVisitName, new Map())
            .values()]
            .map(_.identity);
    }

    dueChecklistForDefaultDashboard = (date, queryAdditions) => {
        if (!this.showDueChecklistOnDashboard) {
            return {individual: [], checklistItemNames: []}
        }
        return this.dueChecklists(date, [], queryAdditions);
    }

    dueChecklists(ignored, reportFilters, queryAdditions) {
        const addressFilter = DashboardReportFilter.getAddressFilter(reportFilters);
        let childEnrolments = this.db.objects(ProgramEnrolment.schema.name)
            .filtered('voided = false ' + 'AND individual.voided = false ' + 'AND program.name = $0', 'Child');
        if (!_.isEmpty(queryAdditions)) {
            childEnrolments = childEnrolments.filtered(`${queryAdditions}`);
        }
        childEnrolments = RealmQueryService.filterBasedOnAddress(ProgramEnrolment.schema.name, childEnrolments, addressFilter);
        const checklistItemNames = [];
        const enrolmentsWithDueChecklist = childEnrolments.filter(enrolment => {
            let stateArray = [];
            _.some(enrolment.checklists, checklist => {
                _.forEach(checklist.items, items => {
                    let applicableState = items.calculateApplicableState();
                    if (!!applicableState.status && applicableState.status.state === "Due") {
                        checklistItemNames.push(items.detail.concept.name)
                        stateArray.push(applicableState.status.state)
                    }
                })
            })
            return _.includes(stateArray, "Due");
        }).map(_.identity);

        let individualsWithVisitInfo = _.map(enrolmentsWithDueChecklist, enl => {
            const individual = enl.individual;
            const enrolmentDateTime = enl.enrolmentDateTime;
            return {
                individual,
                visitInfo: {
                    uuid: individual.uuid,
                    visitName: [],
                    groupingBy: General.formatDate(enrolmentDateTime),
                    sortingBy: enrolmentDateTime,
                    allow: true,
                }
            };
        });
        return {
            individual: individualsWithVisitInfo, checklistItemNames
        }
    }

    voidUnVoidIndividual(individualUUID, setVoided, groupAffiliation) {
        const individual = this.findByUUID(individualUUID);
        let individualClone = individual.cloneForEdit();
        individualClone.voided = setVoided;
        const groupSubjectObservations = this.updateGroupSubjectVoidedStatus(groupAffiliation, setVoided);
        this.register(individualClone, [], undefined, groupSubjectObservations);
    }

    updateGroupSubjectVoidedStatus(groupAffiliation, setVoided) {
        const groupSubjectObservations = groupAffiliation.groupSubjectObservations.map(grpSubject => {
            const clonedGrpSubject = {groupSubject: grpSubject.groupSubject.cloneForEdit()};
            clonedGrpSubject.groupSubject.voided = setVoided;
            return clonedGrpSubject;
        }) || [];
        return groupSubjectObservations;
    }

    determineSubjectForVisitToBeScheduled(individual, nextScheduledVisit) {
        return nextScheduledVisit.subject ? nextScheduledVisit.subject : individual;
    }

    validateAndInjectOtherSubjectForScheduledVisit(individual, nextScheduledVisits) {
        const filteredNextScheduledVisits = [];
        nextScheduledVisits.map(nsv => {
            if ((!_.isEmpty(nsv.subjectUUID) && individual.uuid !== nsv.subjectUUID) ||
                (!_.isEmpty(nsv.programEnrolment) && individual.uuid !== nsv.programEnrolment.individual.uuid)) {
                const subject = !_.isEmpty(nsv.programEnrolment) ? nsv.programEnrolment.individual : this.findByUUID(nsv.subjectUUID);
                try {
                    if (_.isEmpty(subject)) {
                        throw Error(`Attempted to schedule visit for non-existent subject with uuid ${nsv.subjectUUID}`)
                    }
                    if (!this.unVoided(subject)) {
                        throw Error(`Attempted to schedule visit for voided subject with uuid: ${subject.uuid}`);
                    }
                    nsv.subject = subject;
                    filteredNextScheduledVisits.push(nsv);
                } catch (e) {
                    General.logDebug("Rule-Failure", `Error while saving visit schedule for other subject: ${nsv.subjectUUID}`);
                    const subjectTypeUUID = _.isEmpty(subject) ? individual.subjectType.uuid : subject.subjectType.uuid;
                    this.getService(RuleEvaluationService).saveFailedRules(e, subjectTypeUUID, individual.uuid,
                        'VisitSchedule', individual.subjectType.uuid, !_.isEmpty(nsv.programEnrolment) ? 'ProgramEncounter' : 'Encounter', nsv.uuid);
                }
            } else {
                //not setting nsv.subject here to differentiate these from visits being scheduled for other subjects
                filteredNextScheduledVisits.push(nsv);
            }
        });
        return filteredNextScheduledVisits;
    }

    getSubjectsInLocation(addressLevel, subjectTypeName) {
        return this.getAllNonVoided()
            .filtered('lowestAddressLevel.uuid = $0 and subjectType.name = $1', addressLevel.uuid, subjectTypeName);
    }

    getSubjectWithTheNameAndType({firstName, middleName, lastName, subjectType, uuid}) {
        return this.getAllNonVoided()
            .filtered(`uuid <> $0 and firstName = $1 and lastName = $2 and subjectType.uuid = $3 and middleName = $4`,
                uuid, firstName, lastName, subjectType.uuid, middleName);
    }

    getAllBySubjectTypeUUID(subjectTypeUUID) {
        return this.getAllNonVoided().filtered('subjectType.uuid = $0', subjectTypeUUID)
            .sorted('name');
    }

    findAllWithMobileNumber(mobileNumber, subjectTypeUUID = null) {
        const toMatchMobileNumber = _.toString(mobileNumber).slice(-10);
        const allSubjects = subjectTypeUUID ? this.getAllBySubjectTypeUUID(subjectTypeUUID) : this.getAllNonVoided();
        const probableSubjects = allSubjects.filtered(`(observations.concept.keyValues.key = "${KeyValue.PrimaryContactKey}" or observations.concept.keyValues.key = "${KeyValue.ContactNumberKey}") and (observations.valueJSON CONTAINS "${toMatchMobileNumber}")`);
        return probableSubjects.filter((subject) => {
            return _.toString(subject.getMobileNumber()).slice(-10) === toMatchMobileNumber;
        });
    }

    getAllBySubjectType(subjectType) {
        return this.getAll().filtered('subjectType = $0', subjectType);
    }
}

export default IndividualService;
