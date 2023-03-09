import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {
    EncounterType,
    EntityQueue,
    FormMapping,
    ObservationsHolder,
    ProgramEncounter,
    ProgramEnrolment
} from 'avni-models';
import moment from "moment";
import _ from 'lodash';
import General from "../../utility/General";
import MediaQueueService from "../MediaQueueService";
import IndividualService from "../IndividualService";
import EncounterService from "../EncounterService";
import EntityApprovalStatusService from "../EntityApprovalStatusService";
import FormMappingService from "../FormMappingService";

@Service("ProgramEncounterService")
class ProgramEncounterService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEncounter.schema.name;
    }

    getProgramSummary(program) {
        const encounterSummary = {};
        const unfulfilledEncounters = this.db.objects(ProgramEncounter.schema.name).filtered(`encounterDateTime == null AND earliestVisitDateTime != null AND programEnrolment.program.uuid == \"${program.uuid}\"`).sorted('earliestVisitDateTime');
        encounterSummary.upcoming = 0;
        encounterSummary.overdue = 0;

        unfulfilledEncounters.forEach((programEncounter) => {
            if (moment(programEncounter.earliestVisitDateTime).subtract(7, 'days').isAfter(moment())) {
                encounterSummary.upcoming++;
            } else if (General.dateAIsAfterB(new Date(), programEncounter.earliestVisitDateTime)) {
                encounterSummary.overdue++;
            }
        });
        encounterSummary.openEncounters = unfulfilledEncounters;
        return encounterSummary;
    }

    _saveEncounter(programEncounter, db) {
        programEncounter = db.create(ProgramEncounter.schema.name, programEncounter, true);
        const enrolment = this.findByUUID(programEncounter.programEnrolment.uuid, ProgramEnrolment.schema.name);
        enrolment.addEncounter(programEncounter);
        db.create(EntityQueue.schema.name, EntityQueue.create(programEncounter, ProgramEncounter.schema.name));
        this.getService(MediaQueueService).addMediaToQueue(programEncounter, ProgramEncounter.schema.name);
    }

    saveScheduledVisit(programEnrolment, nextScheduledVisit, db, schedulerDate) {
        const {encounterType: encounterTypeName, visitCreationStrategy = 'default'} = nextScheduledVisit;

        let encountersToUpdate = programEnrolment.scheduledEncountersOfType(encounterTypeName);
        if (_.isEmpty(encountersToUpdate) || visitCreationStrategy === 'createNew') {
            const encounterType = this.findByKey('name', encounterTypeName, EncounterType.schema.name);
            if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for encounter type=${encounterTypeName} that doesn't exist`);
            const isProgramEncounter = this.findByCriteria(`observationsTypeEntityUUID = '${encounterType.uuid}' && form.formType = 'ProgramEncounter' && voided = false`, FormMapping.schema.name);
            if (isProgramEncounter) {
                encountersToUpdate = [ProgramEncounter.createScheduled(encounterType, programEnrolment)];
            } else {
                this.getService(EncounterService).saveScheduledVisit(enrolment.individual, nextScheduledVisit, db, schedulerDate);
            }
        }
        _.forEach(encountersToUpdate, enc => this._saveEncounter(enc.updateSchedule(nextScheduledVisit), db));
    }

    saveScheduledVisits(enrolment, nextScheduledVisits = [], db, schedulerDate) {
        return nextScheduledVisits.map(nSV =>{
            if (nSV.programEnrolment) {
                enrolment = this.findByUUID(nSV.programEnrolment.uuid, ProgramEnrolment.schema.name);
                return this.saveScheduledVisit(enrolment, nSV, db, schedulerDate);
            }

            enrolment = this.findByUUID(enrolment.uuid, ProgramEnrolment.schema.name);
            if (this.getService(IndividualService).determineSubjectForVisitToBeScheduled(enrolment.individual, nSV).uuid !== enrolment.individual.uuid) {
                return this.getService(EncounterService).saveScheduledVisit(nSV.subject, nSV, db, schedulerDate);
            }
            return this.saveScheduledVisit(enrolment, nSV, db, schedulerDate);
        });
    }

    saveOrUpdate(programEncounter, nextScheduledVisits, skipCreatingPendingStatus) {
        General.logDebug('ProgramEncounterService', `New Program Encounter UUID: ${programEncounter.uuid}`);
        ObservationsHolder.convertObsForSave(programEncounter.observations);
        ObservationsHolder.convertObsForSave(programEncounter.cancelObservations);
        const entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        const isCancelFlow = _.isNil(programEncounter.encounterDateTime);
        const isApprovalEnabled = this.getService(FormMappingService).isApprovalEnabledForProgramEncounterForm(_.get(programEncounter, 'individual.subjectType'), _.get(programEncounter, 'programEnrolment.program'), programEncounter.encounterType, isCancelFlow);

        const db = this.db;
        this.db.write(() => {
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                programEncounter.latestEntityApprovalStatus = entityApprovalStatusService.createPendingStatus(programEncounter.uuid, ProgramEncounter.schema.name, db, programEncounter.encounterType.uuid);
            this._saveEncounter(programEncounter, db);
            this.saveScheduledVisits(programEncounter.programEnrolment, nextScheduledVisits, db, programEncounter.encounterDateTime);
        });
        return programEncounter;
    }

    findDueEncounter({encounterTypeUUID, enrolmentUUID, encounterTypeName, encounterName}) {
        return this.filtered('encounterType.name == $0 OR encounterType.uuid == $1', encounterTypeName, encounterTypeUUID)
            .filtered(_.isEmpty(encounterName) ? 'uuid != null' : 'name = $0', encounterName)
            .filtered('programEnrolment.uuid == $0', enrolmentUUID)
            .filtered('encounterDateTime == null AND cancelDateTime == null')[0];
    }

    getAllDueForSubject(subjectUUID) {
        return this.filtered(`voided = false and programEnrolment.individual.uuid = $0 and encounterDateTime == null AND cancelDateTime == null`, subjectUUID)
    }
}

export default ProgramEncounterService;
