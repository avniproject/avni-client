import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FormMappingService from "./FormMappingService";
import General from "../utility/General";
import {Encounter, EncounterType, EntityQueue, Individual, ObservationsHolder, FormMapping, EntityApprovalStatus, ApprovalStatus} from 'avni-models';
import _ from 'lodash';
import MediaQueueService from "./MediaQueueService";
import IndividualService from "./IndividualService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import EntityApprovalStatusService from "./EntityApprovalStatusService";

@Service("EncounterService")
class EncounterService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Encounter.schema.name;
    }

    getEncounters(individual) {
        const db = this.db;
        return this.db.objects(Encounter.schema.name).filtered(`individual.uuid="${individual.uuid}"`);
    }

    isEncounterTypeCancellable(encounter) {
        if (!_.isNil(encounter.programEnrolment) || !_.isNil(encounter.individual)) {
            let formMappingService = this.getService(FormMappingService);
            const program = encounter.programEnrolment && encounter.programEnrolment.program || null;
            let form = formMappingService.findFormForCancellingEncounterType(
                encounter.encounterType,
                program,
                encounter.subjectType
            );
            if (_.isNil(form)) {
                General.logDebug('EncounterService.isEncounterTypeCancellable', `No form associated with ET=${encounter.encounterType.uuid}`);
                return false;
            }
            let cancellable = encounter.isCancellable();
            if (!cancellable) {
                General.logDebug('EncounterService.isEncounterTypeCancellable', `${encounter.encounterType.name}, Not Cancellable because of encounter`);
            }
            return cancellable;
        } else {
            General.logDebug('EncounterService.isEncounterTypeCancellable', 'Not a ProgramEncounter');
            return false;
        }
    }

    _saveEncounter(encounter, db) {
        encounter = db.create(Encounter.schema.name, encounter, true);
        const individual = this.findByUUID(encounter.individual.uuid, Individual.schema.name);
        individual.addEncounter(encounter);
        db.create(EntityQueue.schema.name, EntityQueue.create(encounter, Encounter.schema.name));
        this.getService(MediaQueueService).addMediaToQueue(encounter, Encounter.schema.name);
    }

    saveScheduledVisit(ind, nextScheduledVisit, db, schedulerDate) {
        const {encounterType: encounterTypeName, visitCreationStrategy = 'default', individual = ind} = nextScheduledVisit;

        let encountersToUpdate = individual.scheduledEncountersOfType(encounterTypeName);
        if (_.isEmpty(encountersToUpdate) || visitCreationStrategy === 'createNew') {
            const encounterType = this.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
            if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for encounter type=${nextScheduledVisit.encounterType} that doesn't exist`);
            const isProgramEncounter = this.findByCriteria(`observationsTypeEntityUUID = '${encounterType.uuid}' && form.formType = 'ProgramEncounter' && voided = false`, FormMapping.schema.name);
            if (!isProgramEncounter) {
                encountersToUpdate = [Encounter.createScheduled(encounterType, individual)];
            } else {
                this.getService(ProgramEncounterService).saveScheduledVisit(nextScheduledVisit.programEnrolment, nextScheduledVisit, db, schedulerDate);
            }
        }
        _.forEach(encountersToUpdate, enc => this._saveEncounter(enc.updateSchedule(nextScheduledVisit), db));
    }

    saveScheduledVisits(individual, nextScheduledVisits = [], db, schedulerDate) {
        return nextScheduledVisits.map(nSV => {
            return this.saveScheduledVisit(this.getService(IndividualService).determineSubjectForVisitToBeScheduled(individual, nSV), nSV, db, schedulerDate);
        });
    }

    saveOrUpdate(encounter, nextScheduledVisits = [], skipCreatingPendingStatus) {
        General.logDebug('EncounterService', `New Encounter UUID: ${encounter.uuid}`);
        ObservationsHolder.convertObsForSave(encounter.observations);
        ObservationsHolder.convertObsForSave(encounter.cancelObservations);
        const entityApprovalStatusService = this.getService(EntityApprovalStatusService);
        const isCancelFlow = _.isNil(encounter.encounterDateTime);
        const isApprovalEnabled = this.getService(FormMappingService).isApprovalEnabledForEncounterForm(encounter.individual.subjectType, encounter.encounterType, isCancelFlow);

        const db = this.db;
        this.db.write(() => {
            if (!skipCreatingPendingStatus && isApprovalEnabled)
                encounter.latestEntityApprovalStatus = entityApprovalStatusService.createPendingStatus(encounter.uuid, Encounter.schema.name, db, encounter.encounterType.uuid);
            this._saveEncounter(encounter, db);
            this.saveScheduledVisits(encounter.individual, nextScheduledVisits, db, encounter.encounterDateTime);
        });
        return encounter;
    }

    findDueEncounter({encounterTypeUUID, individualUUID, encounterTypeName}) {
        return this.filtered('encounterType.name == $0 OR encounterType.uuid == $1', encounterTypeName, encounterTypeUUID)
            .filtered('individual.uuid == $0', individualUUID)
            .filtered('encounterDateTime == null AND cancelDateTime == null')[0];
    }

    getAllDueForSubject(subjectUUID) {
        return this.filtered(`voided = false and individual.uuid = $0 and encounterDateTime == null AND cancelDateTime == null`, subjectUUID)
    }

    getAllBySubjectUUIDAndTypeUUID(subjectUUID, encounterTypeUUID) {
        return this.getAllNonVoided().filtered(`individual.uuid = '${subjectUUID}' and encounterType.uuid = '${encounterTypeUUID}'`);
    }
}

export default EncounterService;
