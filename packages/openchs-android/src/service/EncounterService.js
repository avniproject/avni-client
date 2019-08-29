import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FormMappingService from "./FormMappingService";
import General from "../utility/General";
import {Encounter, EncounterType, EntityQueue, Individual, ObservationsHolder} from 'openchs-models';
import _ from 'lodash';
import MediaQueueService from "./MediaQueueService";

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
        if (_.isNil(encounter['programEnrolment'])) {
            General.logDebug('EncounterService.isEncounterTypeCancellable', 'Not a ProgramEncounter');
            return false;
        }

        let formMappingService = this.getService(FormMappingService);
        let form = formMappingService.findFormForCancellingEncounterType(
            encounter.encounterType,
            encounter.programEnrolment.program,
            encounter.subjectType
        );
        if (_.isNil(form)) {
            General.logDebug('EncounterService.isEncounterTypeCancellable', `No form associated with ET=${encounter.encounterType.uuid} and Program=${encounter.programEnrolment.program.uuid}`);
            return false;
        }
        let cancellable = encounter.isCancellable();
        if (!cancellable) {
            General.logDebug('EncounterService.isEncounterTypeCancellable', `${encounter.encounterType.name}, ${encounter.programEnrolment.program.name}, Not Cancellable because of encounter`);
        }
        return cancellable;
    }

    _saveEncounter(encounter, db) {
        encounter = db.create(Encounter.schema.name, encounter, true);
        const individual = this.findByUUID(encounter.individual.uuid, Individual.schema.name);
        individual.addEncounter(encounter);
        db.create(EntityQueue.schema.name, EntityQueue.create(encounter, Encounter.schema.name));
        this.getService(MediaQueueService).addMediaToQueue(encounter, Encounter.schema.name);
    }

    saveScheduledVisit(individual, nextScheduledVisit, db, schedulerDate) {
        let encountersToUpdate = individual.scheduledEncountersOfType(nextScheduledVisit.encounterType);
        if (_.isEmpty(encountersToUpdate)) {
            const encounterType = this.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
            if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for encounter type=${nextScheduledVisit.encounterType} that doesn't exist`);
            encountersToUpdate = [Encounter.createScheduled(encounterType, individual)];
        }
        _.forEach(encountersToUpdate, enc => this._saveEncounter(enc.updateSchedule(nextScheduledVisit), db));
    }

    saveScheduledVisits(individual, nextScheduledVisits = [], db, schedulerDate) {
        return nextScheduledVisits.map(nSV => {
            return this.saveScheduledVisit(individual, nSV, db, schedulerDate);
        });
    }

    saveOrUpdate(encounter, nextScheduledVisits = []) {
        General.logDebug('EncounterService', `New Encounter UUID: ${encounter.uuid}`);
        ObservationsHolder.convertObsForSave(encounter.observations);
        ObservationsHolder.convertObsForSave(encounter.cancelObservations);

        const db = this.db;
        this.db.write(() => {
            this._saveEncounter(encounter, db);
            this.saveScheduledVisits(encounter.individual, nextScheduledVisits, db, encounter.encounterDateTime);
        });
        return encounter;
    }
}

export default EncounterService;