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
import RuleEvaluationService from "./RuleEvaluationService";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import UpdateMode from "../repository/UpdateMode";

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    static convertObsForSave(programEnrolment) {
        ObservationsHolder.convertObsForSave(programEnrolment.observations);
        ObservationsHolder.convertObsForSave(programEnrolment.programExitObservations);
        _.forEach(programEnrolment.checklists, c => _.forEach(c.items, i => ObservationsHolder.convertObsForSave(i.observations)));
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    //This method should be removed once we know and fix the cause of observation deletion from the program enrolment.
    checkAndNotifyForRemovedObservations(programEnrolment, workflowInfo) {
        const programEnrolmentForm = this.getService(FormMappingService).findFormForProgramEnrolment(programEnrolment.program, programEnrolment.individual.subjectType);
        const ruleEvaluationService = this.getService(RuleEvaluationService);
        const savedInDb = this.findByUUID(programEnrolment.uuid);
        const conceptsRemovedInCurrentObservation = [];
        _.forEach(programEnrolmentForm.nonVoidedFormElementGroups(), feg => {
            const formElementStatuses = ruleEvaluationService.getFormElementsStatuses(programEnrolment, this.getSchema(), feg);
            _.forEach(feg.nonVoidedFormElements(), fe => {
                const formElementStatus = _.find(formElementStatuses, ({uuid}) => uuid === fe.uuid);
                if (_.get(formElementStatus, 'visibility') && fe.mandatory) {
                    const savedMandatoryObs = _.find(savedInDb.observations, obs => obs.concept.uuid === fe.concept.uuid);
                    if (!_.isNil(savedMandatoryObs)) {
                        const currentMandatoryObs = _.find(programEnrolment.observations, cObs => cObs.concept.uuid === savedMandatoryObs.concept.uuid);
                        if (_.isNil(currentMandatoryObs)) {
                            conceptsRemovedInCurrentObservation.push({programEnrolmentUuid: programEnrolment.uuid, missingConcept: savedMandatoryObs.concept.name, ...workflowInfo})
                        }
                    }
                }
            })
        });
        if (!_.isEmpty(conceptsRemovedInCurrentObservation)) {
            const error = new Error(`Mandatory fields removed from enrolment observations. Details: ${JSON.stringify(conceptsRemovedInCurrentObservation)}`);
            General.logDebug('ProgramEnrolmentService', `Notifying Bugsnag ${error}`);
            ErrorUtil.notifyBugsnag(error, "ProgramEnrolmentService");
        }
    }

    updateObservations(programEnrolment, workflowInfo) {
        if (!_.isNil(workflowInfo))
            this.checkAndNotifyForRemovedObservations(programEnrolment, workflowInfo);
        programEnrolment.updateAudit(this.getUserInfo(), false);
        this.transactionManager.write(() => {
            ProgramEnrolmentService.convertObsForSave(programEnrolment);
            this.repository.create({
                uuid: programEnrolment.uuid,
                observations: programEnrolment.observations,
                programExitObservations: programEnrolment.programExitObservations
            }, UpdateMode.Modified);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }

    enrol(programEnrolment, checklists = [], nextScheduledVisits, skipCreatingPendingStatus, groupSubjectObservations = []) {
        const entityQueueItems = [];
        const programEncounterService = this.getService(ProgramEncounterService);
        const entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        const individual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
        const isApprovalEnabled = this.getService(FormMappingService).isApprovalEnabledForProgramForm(individual.subjectType, programEnrolment.program);
        const isNew = this.isNew(programEnrolment);
        this.transactionManager.write(() => {
            ProgramEnrolmentService.convertObsForSave(programEnrolment);
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                entityApprovalStatusService.createPendingStatus(programEnrolment, ProgramEnrolment.schema.name, programEnrolment.program.uuid);
            programEnrolment = this.repository.create(programEnrolment, UpdateMode.Modified);
            programEnrolment.updateAudit(this.getUserInfo(), isNew);
            entityQueueItems.push(EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
            this.getService(MediaQueueService).addMediaToQueue(programEnrolment, ProgramEnrolment.schema.name);
            programEncounterService.saveScheduledVisits(programEnrolment, nextScheduledVisits, programEnrolment.enrolmentDateTime);
            const checklistService = this.getService(ChecklistService);
            checklists
                .map((checklist) => checklistService.saveOrUpdate.bind(this)(programEnrolment, checklist))
                .reduce((acc, v) => acc.concat(v), [])
                .forEach((eq) => entityQueueItems.push(eq));

            General.logDebug('ProgramEnrolmentService', 'Checklist added to ProgramEnrolment');

            individual.addEnrolment(programEnrolment);
            General.logDebug('ProgramEnrolmentService', 'ProgramEnrolment added to Individual');

            const enrolmentForm = this.getService(FormMappingService).findFormForProgramEnrolment(programEnrolment.program, individual.subjectType);
            this.getService(IdentifierAssignmentService).assignPopulatedIdentifiersFromObservations(enrolmentForm, programEnrolment.observations, null, programEnrolment);

            entityQueueItems.forEach((entityQueue) => this.getRepository(EntityQueue.schema.name).create(entityQueue));
            _.forEach(groupSubjectObservations, this.getService(GroupSubjectService).addSubjectToGroup(individual));
        });
        return programEnrolment;
    }

    exit(programEnrolment, skipCreatingPendingStatus, groupSubjectObservations = []) {
        const entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        ProgramEnrolmentService.convertObsForSave(programEnrolment);
        const individual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
        const isApprovalEnabled = this.getService(FormMappingService).isApprovalEnabledForProgramForm(individual.subjectType, programEnrolment.program, true);
        this.transactionManager.write(() => {
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                entityApprovalStatusService.createPendingStatus(programEnrolment, ProgramEnrolment.schema.name, programEnrolment.program.uuid);
            this.repository.create(programEnrolment, UpdateMode.Modified);
            programEnrolment.updateAudit(this.getUserInfo(), false);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
            _.forEach(groupSubjectObservations, this.getService(GroupSubjectService).addSubjectToGroup(individual));
        });
    }

    getAllEnrolments(programUUID) {
        return this.repository.findAll().filtered(`program.uuid == \"${programUUID}\"`).sorted('enrolmentDateTime', true);
    }

    reJoinProgram(programEnrolment, oldExitObservations) {
        ProgramEnrolmentService.convertObsForSave(programEnrolment);
        programEnrolment.updateAudit(this.getUserInfo(), false);
        this.transactionManager.write(() => {
            this.db.delete(oldExitObservations);
            this.repository.create(programEnrolment, UpdateMode.Modified);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }

    getAllNonExitedEnrolmentsForSubject(subjectUUID) {
        return this.filtered(`voided = false and programExitDateTime = null and individual.uuid = $0`, subjectUUID)
    }

    getEnrolmentBySubjectUuidAndProgramUuid(subjectUUID, programUuid) {
        return this.findByCriteria(`voided = false and programExitDateTime = null and individual.uuid = '${subjectUUID}' and program.uuid = '${programUuid}'`, ProgramEnrolment.schema.name);
    }
}

export default ProgramEnrolmentService;
