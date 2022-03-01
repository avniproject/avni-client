import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {EntityQueue, Individual, ObservationsHolder, ProgramEnrolment} from 'avni-models';
import _ from "lodash";
import ProgramEncounterService from "./program/ProgramEncounterService";
import General from "../utility/General";
import ChecklistService from "./ChecklistService";
import MediaQueueService from "./MediaQueueService";
import FormMappingService from "./FormMappingService";
import IdentifierAssignmentService from "./IdentifierAssignmentService";
import EntityService from "./EntityService";
import EntityApprovalStatusService from "./EntityApprovalStatusService";
import GroupSubjectService from "./GroupSubjectService";
import bugsnag from "../utility/bugsnag";

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    //This method should be removed once we know and fix the cause of observation deletion from the program enrolment.
    //This might give false positive result, as form element might get hidden during edit.
    static checkForMissingObservations(programEnrolment, workflow, getService) {
        const formMappingService = getService(FormMappingService);
        const program = programEnrolment.program;
        const subjectType = programEnrolment.individual.subjectType;
        const programEnrolmentForm = formMappingService.findFormForProgramEnrolment(program, subjectType);
        const mandatoryConcepts = programEnrolmentForm.getMandatoryConcepts();
        const savedInDb = getService(ProgramEnrolmentService).findByUUID(programEnrolment.uuid);
        const conceptsRemovedInCurrentObservation = [];
        _.forEach(mandatoryConcepts, concept => {
            const savedMandatoryObs = _.find(savedInDb.observations, obs => concept.uuid === obs.concept.uuid);
            if (!_.isNil(savedMandatoryObs)) {
                const currentMandatoryObs = _.find(programEnrolment.observations, cObs => cObs.concept.uuid === savedMandatoryObs.concept.uuid);
                if (_.isNil(currentMandatoryObs)) {
                    conceptsRemovedInCurrentObservation.push({workflow, missingConcept: savedMandatoryObs.concept.name})
                }
            }
        });
        if (!_.isEmpty(conceptsRemovedInCurrentObservation)) {
            const error = new Error(`Mandatory fields removed from enrolment observations. Details: ${JSON.stringify(conceptsRemovedInCurrentObservation)}`);
            General.logDebug('ProgramEnrolmentService', `Notifying Bugsnag ${error}`);
            bugsnag.notify(error);
        }
    }

    static convertObsForSave(programEnrolment, workflow, getService) {
        const isNewEntity = getService(ProgramEnrolmentService).findByUUID(programEnrolment.uuid);
        if (!_.isNil(isNewEntity)) {
            ProgramEnrolmentService.checkForMissingObservations(programEnrolment, workflow, getService);
        }
        ObservationsHolder.convertObsForSave(programEnrolment.observations);
        ObservationsHolder.convertObsForSave(programEnrolment.programExitObservations);
        _.forEach(programEnrolment.checklists, c => _.forEach(c.items, i => ObservationsHolder.convertObsForSave(i.observations)));
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    updateObservations(programEnrolment, workflow) {
        const db = this.db;
        this.db.write(() => {
            ProgramEnrolmentService.convertObsForSave(programEnrolment, workflow, this.getService.bind(this));
            db.create(ProgramEnrolment.schema.name, {
                uuid: programEnrolment.uuid,
                observations: programEnrolment.observations
            }, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }

    enrol(programEnrolment, checklists = [], nextScheduledVisits, skipCreatingPendingStatus, groupSubjectObservations = []) {
        const db = this.db;
        const entityQueueItems = [];
        const programEncounterService = this.getService(ProgramEncounterService);
        const entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        const individual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
        const isApprovalEnabled = this.getService(FormMappingService).isApprovalEnabledForProgramForm(individual.subjectType, programEnrolment.program);
        this.db.write(() => {
            ProgramEnrolmentService.convertObsForSave(programEnrolment, 'Program enrolment', this.getService.bind(this));
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                programEnrolment.latestEntityApprovalStatus = entityApprovalStatusService.createPendingStatus(programEnrolment.uuid, ProgramEnrolment.schema.name, db);
            programEnrolment = db.create(ProgramEnrolment.schema.name, programEnrolment, true);
            entityQueueItems.push(EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
            this.getService(MediaQueueService).addMediaToQueue(programEnrolment, ProgramEnrolment.schema.name);
            General.logDebug('ProgramEnrolmentService', 'Saved ProgramEnrolment');
            programEncounterService.saveScheduledVisits(programEnrolment, nextScheduledVisits, db, programEnrolment.enrolmentDateTime);
            General.logDebug('ProgramEnrolmentService', 'Added scheduled visits to ProgramEnrolment');
            const checklistService = this.getService(ChecklistService);
            checklists
                .map((checklist) => checklistService.saveOrUpdate.bind(this)(programEnrolment, checklist, db))
                .reduce((acc, v) => acc.concat(v), [])
                .forEach((eq) => entityQueueItems.push(eq));

            General.logDebug('ProgramEnrolmentService', 'Checklist added to ProgramEnrolment');

            individual.addEnrolment(programEnrolment);
            General.logDebug('ProgramEnrolmentService', 'ProgramEnrolment added to Individual');

            const enrolmentForm = this.getService(FormMappingService).findFormForProgramEnrolment(programEnrolment.program, individual.subjectType);
            this.getService(IdentifierAssignmentService).assignPopulatedIdentifiersFromObservations(enrolmentForm, programEnrolment.observations, null, programEnrolment);

            entityQueueItems.forEach((entityQueue) => db.create(EntityQueue.schema.name, entityQueue));
            _.forEach(groupSubjectObservations, this.getService(GroupSubjectService).addSubjectToGroup(individual, db));
        });
        return programEnrolment;
    }

    exit(programEnrolment, skipCreatingPendingStatus, groupSubjectObservations = []) {
        const entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        ProgramEnrolmentService.convertObsForSave(programEnrolment, 'Program exit', this.getService.bind(this));
        const db = this.db;
        const individual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
        const isApprovalEnabled = this.getService(FormMappingService).isApprovalEnabledForProgramForm(individual.subjectType, programEnrolment.program, true);
        this.db.write(() => {
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                programEnrolment.latestEntityApprovalStatus = entityApprovalStatusService.createPendingStatus(programEnrolment.uuid, ProgramEnrolment.schema.name, db);
            db.create(ProgramEnrolment.schema.name, programEnrolment, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
            _.forEach(groupSubjectObservations, this.getService(GroupSubjectService).addSubjectToGroup(individual, db));
        });
    }

    getProgramReport(program) {
        const programSummary = this.getService(ProgramEncounterService).getProgramSummary(program);
        const all = this.db.objects(ProgramEnrolment.schema.name).filtered(`program.uuid == \"${program.uuid}\"`);
        programSummary.total = all.length;
        programSummary.open = 0;
        all.forEach((enrolment) => {
            if (_.isNil(enrolment.enrolmentDateTime)) programSummary.open++;
        });
        programSummary.program = program;
        return programSummary;
    }

    getAllEnrolments(programUUID) {
        return this.db.objects(ProgramEnrolment.schema.name).filtered(`program.uuid == \"${programUUID}\"`).sorted('enrolmentDateTime', true);
    }

    reJoinProgram(programEnrolment) {
        ProgramEnrolmentService.convertObsForSave(programEnrolment, 'Undo exit', this.getService.bind(this));
        const entityService = this.getService(EntityService);
        entityService.saveAndPushToEntityQueue(programEnrolment, ProgramEnrolment.schema.name);
    }

    getAllNonExitedEnrolmentsForSubject(subjectUUID) {
        return this.filtered(`voided = false and programExitDateTime = null and individual.uuid = $0`, subjectUUID)
    }
}

export default ProgramEnrolmentService;
