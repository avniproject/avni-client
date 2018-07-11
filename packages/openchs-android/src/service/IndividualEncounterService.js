import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {Encounter, Individual, EntityQueue, ObservationsHolder} from "openchs-models";
import _ from 'lodash';
import {EncounterType} from "../../../openchs-models";

@Service("individualEncounterService")
class IndividualEncounterService extends BaseService {
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

    _saveEncounter(encounter, db) {
        encounter = db.create(Encounter.schema.name, encounter, true);
        const individual = this.findByUUID(encounter.individual.uuid, Individual.schema.name);
        individual.addEncounter(encounter);
        db.create(EntityQueue.schema.name, EntityQueue.create(encounter, Encounter.schema.name));
    }

    saveScheduledVisit(individual, nextScheduledVisit, db) {
        const encounterType = this.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
        if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for encounter type=${nextScheduledVisit.encounterType} that doesn't exist`);

        let encounterToSchedule;
        if (nextScheduledVisit.uuid) {
            encounterToSchedule = this.findByUUID(nextScheduledVisit.uuid, Encounter.schema.name);
            encounterToSchedule.encounterType = encounterType;
        }
        if (!encounterToSchedule) {
            encounterToSchedule = Encounter.createScheduledEncounter(encounterType, individual);
        }

        encounterToSchedule.updateSchedule(nextScheduledVisit);
        this._saveEncounter(encounterToSchedule, db);
    }

    saveOrUpdate(encounter, scheduledVisits = []) {
        ObservationsHolder.convertObsForSave(encounter.observations);
        const db = this.db;
        this.db.write(() => {
            db.create(Encounter.schema.name, encounter, true);

            const loadedEncounter = this.findByUUID(encounter.uuid, Encounter.schema.name);
            const individual = this.findByUUID(encounter.individual.uuid, Individual.schema.name);
            individual.addEncounter(loadedEncounter);
            scheduledVisits.map(sV => this.saveScheduledVisit(encounter.individual, sV, db));
            db.create(EntityQueue.schema.name, EntityQueue.create(encounter, Encounter.schema.name));
        });
        return encounter;
    }
}

export default IndividualEncounterService;