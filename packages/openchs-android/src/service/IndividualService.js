import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {
    Encounter,
    EntityQueue,
    GroupSubject,
    Individual,
    ObservationsHolder,
    Privilege,
    ProgramEncounter,
    ProgramEnrolment
} from "avni-models";
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

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.allHighRiskPatients = this.allHighRiskPatients.bind(this);
        this.allCompletedVisitsIn = this.allCompletedVisitsIn.bind(this);
        this.allScheduledVisitsIn = this.allScheduledVisitsIn.bind(this);
        this.allOverdueVisitsIn = this.allOverdueVisitsIn.bind(this);
        this.recentlyCompletedVisitsIn = this.recentlyCompletedVisitsIn.bind(this);
        this.recentlyRegistered = this.recentlyRegistered.bind(this);
        this.recentlyEnrolled = this.recentlyEnrolled.bind(this);
        this.allIn = this.allIn.bind(this);
    }

    getSchema() {
        return Individual.schema.name;
    }

    init() {
        this.encounterService = this.getService(EncounterService);
        this.entityApprovalStatusService = this.getService(EntityApprovalStatusService);
    }

    search(criteria) {
        const filterCriteria = criteria.getFilterCriteria();
        let searchResults;
        if (_.isEmpty(filterCriteria)) {
            searchResults = this.db.objects(Individual.schema.name);
        } else {
            searchResults = this.db
                .objects(Individual.schema.name)
                .filtered(
                    filterCriteria,
                    criteria.getMinDateOfBirth(),
                    criteria.getMaxDateOfBirth()
                ).sorted('name');
        }
        return searchResults;
    }

    register(individual, nextScheduledVisits, skipCreatingPendingStatus, groupSubjectObservations) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(individual.observations);
        const formMappingService = this.getService(FormMappingService);
        const registrationForm = formMappingService.findRegistrationForm(individual.subjectType);
        const isApprovalEnabled = formMappingService.isApprovalEnabledForRegistrationForm(individual.subjectType);
        this.db.write(() => {
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                individual.latestEntityApprovalStatus = this.entityApprovalStatusService.createPendingStatus(individual.uuid, Individual.schema.name, db);
            const saved = db.create(Individual.schema.name, individual, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
            this.getService(MediaQueueService).addMediaToQueue(individual, Individual.schema.name);
            this.getService(IdentifierAssignmentService).assignPopulatedIdentifiersFromObservations(registrationForm, individual.observations, individual);
            _.forEach(groupSubjectObservations, this.getService(GroupSubjectService).addSubjectToGroup(saved, db));
            this.encounterService.saveScheduledVisits(saved, nextScheduledVisits, db, saved.registrationDate);
        });
    }

    updateObservations(individual) {
        const db = this.db;
        this.db.write(() => {
            ObservationsHolder.convertObsForSave(individual.observations);
            db.create(Individual.schema.name, {
                uuid: individual.uuid,
                observations: individual.observations
            }, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
        });
    }

    eligiblePrograms(individualUUID) {
        const individual = this.findByUUID(individualUUID);
        const programs = this.getService(FormMappingService).findActiveProgramsForSubjectType(individual.subjectType);
        const nonEnrolledPrograms = individual.eligiblePrograms(programs);
        const ruleEvaluationService = this.getService(RuleEvaluationService);
        const enrolProgramCriteria = `privilege.name = '${Privilege.privilegeName.enrolSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}'`;
        const privilegeService = this.getService(PrivilegeService);

        const allowedEnrolmentTypeUuids = privilegeService.allowedEntityTypeUUIDListForCriteria(enrolProgramCriteria, 'programUuid');
        return _.filter(nonEnrolledPrograms, (program) => ruleEvaluationService.isEligibleForProgram(individual, program) && (!privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedEnrolmentTypeUuids, program.uuid)));
    }

    _uniqIndividualsFrom(individuals, individual) {
        individuals.has(individual.uuid) || individuals.set(individual.uuid, individual);
        return individuals;
    }

    _uniqIndividualWithVisitName(individualsWithVisits, individualWithVisit) {
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

    allIn(ignored, queryAdditions) {
        return this.db.objects(Individual.schema.name)
            .filtered('voided = false ')
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .sorted('name');
    }

    allScheduledVisitsIn(date, programEncounterCriteria, encounterCriteria, queryProgramEncounter = true, queryGeneralEncounter = true) {
        const performProgramVisitCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}'`;
        const privilegeService = this.getService(PrivilegeService);
        const allowedProgramEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'programEncounterTypeUuid');
        const dateMidnight = moment(date).endOf('day').toDate();
        const dateMorning = moment(date).startOf('day').toDate();
        const programEncounters = queryProgramEncounter ? this.db.objects(ProgramEncounter.schema.name)
            .filtered('earliestVisitDateTime <= $0 ' +
                'AND maxVisitDateTime >= $1 ' +
                'AND encounterDateTime = null ' +
                'AND cancelDateTime = null ' +
                'AND programEnrolment.programExitDateTime = null ' +
                'AND programEnrolment.voided = false ' +
                'AND programEnrolment.individual.voided = false ' +
                'AND voided = false ',
                dateMidnight,
                dateMorning)
            .filtered((_.isEmpty(programEncounterCriteria) ? 'uuid != null' : `${programEncounterCriteria}`))
            .map((enc) => {
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
                        allow: !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedProgramEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            }) : [];

        const allowedGeneralEncounterTypeUuidsForPerformVisit = this.getService(PrivilegeService).allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'encounterTypeUuid');
        const encounters = queryGeneralEncounter ? this.db.objects(Encounter.schema.name)
            .filtered('earliestVisitDateTime <= $0 ' +
                'AND maxVisitDateTime >= $1 ' +
                'AND encounterDateTime = null ' +
                'AND cancelDateTime = null ' +
                'AND individual.voided = false ' +
                'AND voided = false ',
                dateMidnight,
                dateMorning)
            .filtered((_.isEmpty(encounterCriteria) ? 'uuid != null' : `${encounterCriteria}`))
            .map((enc) => {
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
                        allow: !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedGeneralEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            }) : [];
        const allEncounters = [...
            [...programEncounters, ...encounters]
                .reduce(this._uniqIndividualWithVisitName, new Map())
                .values()
        ];
        return allEncounters;
    }

    allScheduledVisitsCount() {
        return this.allScheduledVisitsIn().length;
    }

    withScheduledVisits(program, addressLevel, encounterType) {
        const todayMidnight = moment(new Date()).endOf('day').toDate();
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND earliestVisitDateTime <= $2 ' +
                'AND maxVisitDateTime >= $3 ' +
                'AND encounterDateTime = null ' +
                'AND cancelDateTime = null ' +
                'AND encounterType.uuid = $4 ',
                program.uuid,
                addressLevel.uuid,
                todayMidnight,
                todayMorning,
                encounterType.uuid)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalScheduledVisits(program, addressLevel, encounterType) {
        return this.withScheduledVisits(program, addressLevel, encounterType).length;
    }

    allOverdueVisitsIn(date, programEncounterCriteria, encounterCriteria, queryProgramEncounter = true, queryGeneralEncounter = true) {
        const privilegeService = this.getService(PrivilegeService);
        const performProgramVisitCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}'`;
        const allowedProgramEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'programEncounterTypeUuid');
        const dateMorning = moment(date).startOf('day').toDate();
        const programEncounters = queryProgramEncounter ? this.db.objects(ProgramEncounter.schema.name)
            .filtered('maxVisitDateTime < $0 ' +
                'AND cancelDateTime = null ' +
                'AND encounterDateTime = null ' +
                'AND programEnrolment.programExitDateTime = null ' +
                'AND programEnrolment.voided = false ' +
                'AND programEnrolment.individual.voided = false ' +
                'AND voided = false ',
                dateMorning)
            .filtered((_.isEmpty(programEncounterCriteria) ? 'uuid != null' : `${programEncounterCriteria}`))
            .map((enc) => {
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
                        allow: !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedProgramEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            }) : [];

        const allowedGeneralEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performProgramVisitCriteria, 'encounterTypeUuid');
        const encounters = queryGeneralEncounter ? this.db.objects(Encounter.schema.name)
            .filtered('maxVisitDateTime < $0 ' +
                'AND cancelDateTime = null ' +
                'AND encounterDateTime = null ' +
                'AND individual.voided = false ' +
                'AND voided = false ',
                dateMorning)
            .filtered((_.isEmpty(encounterCriteria) ? 'uuid != null' : `${encounterCriteria}`))
            .map((enc) => {
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
                        allow: !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedGeneralEncounterTypeUuidsForPerformVisit, enc.encounterType.uuid)
                    }
                };
            }) : [];
        const allEncounters = [...
            [...programEncounters, ...encounters]
                .reduce(this._uniqIndividualWithVisitName, new Map())
                .values()
        ];
        return allEncounters;
    }

    overdueVisits(program, addressLevel, encounterType) {
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND maxVisitDateTime < $2 ' +
                'AND cancelDateTime = null ' +
                'AND encounterDateTime = null ' +
                'AND encounterType.uuid = $3 ',
                program.uuid,
                addressLevel.uuid,
                todayMorning,
                encounterType.uuid)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalOverdueVisits(program, addressLevel, encounterType) {
        return this.overdueVisits(program, addressLevel, encounterType).length;
    }

    allCompletedVisitsIn(date, queryAdditions) {
        let fromDate = moment(date).startOf('day').toDate();
        let tillDate = moment(date).endOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('encounterDateTime <= $0 ' +
                'AND encounterDateTime >= $1 ',
                tillDate,
                fromDate)
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return individual;
            })
            .reduce(this._uniqIndividualsFrom, new Map())
            .values()]
            .map(_.identity);
    }

    recentlyCompletedVisitsIn(date, programEncounterCriteria, encounterCriteria, queryProgramEncounter = true, queryGeneralEncounter = true) {
        let fromDate = moment(date).subtract(1, 'day').startOf('day').toDate();
        let tillDate = moment(date).endOf('day').toDate();
        const programEncounters = queryProgramEncounter ? this.db.objects(ProgramEncounter.schema.name)
            .filtered('voided = false ' +
                'AND programEnrolment.voided = false ' +
                'AND programEnrolment.individual.voided = false ' +
                'AND encounterDateTime <= $0 ' +
                'AND encounterDateTime >= $1 ',
                tillDate,
                fromDate)
            .filtered((_.isEmpty(programEncounterCriteria) ? 'uuid != null' : `${programEncounterCriteria}`))
            .map((enc) => {
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
            }) : [];
        const encounters = queryGeneralEncounter ? this.db.objects(Encounter.schema.name)
            .filtered('voided = false ' +
                'AND individual.voided = false ' +
                'AND encounterDateTime <= $0 ' +
                'AND encounterDateTime >= $1 ',
                tillDate,
                fromDate)
            .filtered((_.isEmpty(encounterCriteria) ? 'uuid != null' : `${encounterCriteria}`))
            .map((enc) => {
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
            }) : [];
        return [...[...programEncounters, ...encounters]
            .reduce(this._uniqIndividualWithVisitName, new Map())
            .values()]
            .map(_.identity);
    }

    recentlyRegistered(date, addressQuery) {
        let fromDate = moment(date).subtract(1, 'day').startOf('day').toDate();
        let tillDate = moment(date).endOf('day').toDate();
        return [...this.db.objects(Individual.schema.name)
            .filtered('voided = false ' +
                'AND registrationDate <= $0 ' +
                'AND registrationDate >= $1 ',
                tillDate,
                fromDate)
            .filtered((_.isEmpty(addressQuery) ? 'uuid != null' : `${addressQuery}`))
            .map((individual) => {
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
            })
            .reduce(this._uniqIndividualWithVisitName, new Map())
            .values()]
            .map(_.identity);
    }

    recentlyEnrolled(date, queryAdditions) {
        let fromDate = moment(date).subtract(1, 'day').startOf('day').toDate();
        let tillDate = moment(date).endOf('day').toDate();
        return [...this.db.objects(ProgramEnrolment.schema.name)
            .filtered('voided = false ' +
                'AND individual.voided = false ' +
                'AND enrolmentDateTime <= $0 ' +
                'AND enrolmentDateTime >= $1 ',
                tillDate,
                fromDate)
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .map((enc) => {
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
            })
            .reduce(this._uniqIndividualWithVisitName, new Map())
            .values()]
            .map(_.identity);
    }

    completedVisits(program, addressLevel, encounterType, fromDate = new Date(), tillDate = new Date()) {
        fromDate = moment(fromDate).startOf('day').toDate();
        tillDate = moment(tillDate).endOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND encounterDateTime <= $2 ' +
                'AND encounterDateTime >= $3 ' +
                'AND encounterType.uuid = $4 ',
                program.uuid,
                addressLevel.uuid,
                tillDate,
                fromDate,
                encounterType.uuid).map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalCompletedVisits(program, addressLevel, encounterType, fromDate, tillDate) {
        return this.completedVisits(program, addressLevel, encounterType, tillDate).length;
    }

    allHighRiskPatients(addressLevel) {
        const HIGH_RISK_CONCEPTS = ["High Risk Conditions", "Adolescent Vulnerabilities"];
        let allEnrolments = this.db.objects(ProgramEnrolment.schema.name);
        if (!_.isNil(addressLevel))
            allEnrolments = allEnrolments.filtered('individual.lowestAddressLevel.uuid = $0', addressLevel.uuid);
        return allEnrolments.filter((enrolment) => HIGH_RISK_CONCEPTS
            .some((concept) => !_.isEmpty(enrolment.findObservation(concept))))
            .map((enrolment) => {
                return _.assignIn({}, enrolment.individual, {addressUUID: enrolment.individual.lowestAddressLevel.uuid});
            });
    }

    allHighRiskPatientCount() {
        return this.allHighRiskPatients().length;
    }

    highRiskPatients(program, addressLevel) {
        const HIGH_RISK_CONCEPTS = ["High Risk Conditions", "Adolescent Vulnerabilities"];
        let allEnrolments = this.db.objects(ProgramEnrolment.schema.name)
            .filtered("program.uuid = $0 " +
                "AND individual.lowestAddressLevel.uuid = $1 ",
                program.uuid,
                addressLevel.uuid);
        return allEnrolments.filter((enrolment) => HIGH_RISK_CONCEPTS
            .some((concept) => !_.isEmpty(enrolment.findObservationInEntireEnrolment(concept))))
            .map((enrolment) => enrolment.individual);
    }

    atRiskFilter(atRiskConcepts) {
        return (individuals) => individuals.filter((individual) => {
            const ind = _.isNil(individual.visitInfo) ? individual : individual.individual;
            return ind.nonVoidedEnrolments().some((enrolment) => atRiskConcepts.length === 0 || atRiskConcepts
                .some(concept => enrolment.observationExistsInEntireEnrolment(concept.name)))
        });
    }

    notAtRiskFilter(atRiskConcepts) {
        return (individuals) => individuals.filter((individual) => {
            const ind = _.isNil(individual.visitInfo) ? individual : individual.individual;
            return !ind.nonVoidedEnrolments().some((enrolment) => atRiskConcepts.length === 0 || atRiskConcepts
                .some(concept => enrolment.observationExistsInEntireEnrolment(concept.name)))
        });
    }

    totalHighRisk(program, addressLevel) {
        return this.highRiskPatients(program, addressLevel).length;
    }


    voidUnVoidIndividual(individualUUID, setVoided) {
        const individual = this.findByUUID(individualUUID);
        let individualClone = individual.cloneForEdit();
        individualClone.voided = setVoided;
        this.register(individualClone);
    }

    determineSubjectForVisitToBeScheduled(individual, nextScheduledVisit) {
        return nextScheduledVisit.subject ? nextScheduledVisit.subject : individual;
    }

    validateAndInjectOtherSubjectForScheduledVisit(individual, nextScheduledVisits) {
        const filteredNextScheduledVisits = [];
        nextScheduledVisits.map(nsv => {
            if ((!_.isEmpty(nsv.subjectUUID) && individual.uuid !== nsv.subjectUUID) ||
                (!_.isEmpty(nsv.programEnrolment) && individual.uuid !== nsv.programEnrolment.individual.uuid)) {
                try {
                    const subject = !_.isEmpty(nsv.programEnrolment) ? nsv.programEnrolment.individual : this.findByUUID(nsv.subjectUUID);
                    if (_.isEmpty(subject)) {
                        throw Error(`Attempted to schedule visit for non-existent subject with uuid ${nsv.subjectUUID}`)
                    }
                    if (!this.unVoided(subject)) {
                        throw Error(`Attempted to schedule visit for voided subject with uuid: ${nsv.subjectUUID}`);
                    }
                    nsv.subject = subject;
                    filteredNextScheduledVisits.push(nsv);
                } catch (e) {
                    General.logDebug("Rule-Failure", `Error while saving visit schedule for other subject: ${nsv.subjectUUID}`);
                    this.getService(RuleEvaluationService).saveFailedRules(e, nsv.subjectUUID, individual.uuid);
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
            .filtered('lowestAddressLevel.uuid = $0 and subjectType.name = $1', addressLevel.uuid, subjectTypeName)
            .map(_.identity);
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

    findAllWithMobileNumber(mobileNumber) {
        return this.getAllNonVoided()
            .filter(ind => _.toString(ind.getMobileNumber()).slice(-10) === _.toString(mobileNumber).slice(-10));
    }

    getAllBySubjectType(subjectType) {
        return this.getAll().filtered('subjectType = $0', subjectType);
    }

}

export default IndividualService;
