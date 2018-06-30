import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {ProgramEncounter, ProgramEnrolment, EncounterType, EntityQueue, ObservationsHolder} from "openchs-models";
import moment from "moment";
import _ from 'lodash';
import General from "../../utility/General";

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
    }

    saveScheduledVisit(enrolment, nextScheduledVisit, db) {
        const encounterType = this.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
        if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for encounter type=${nextScheduledVisit.encounterType} that doesn't exist`);

        let encounterToSchedule;
        if (nextScheduledVisit.uuid) {
            encounterToSchedule = this.findByUUID(nextScheduledVisit.uuid, ProgramEncounter.schema.name);
            encounterToSchedule.encounterType = encounterType;
        }
        if (!encounterToSchedule) {
            encounterToSchedule = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
        }

        encounterToSchedule.updateSchedule(nextScheduledVisit);
        this._saveEncounter(encounterToSchedule, db);
    }

    saveScheduledVisits(enrolment, nextScheduledVisits, db) {
        return nextScheduledVisits.map(nSV => this.saveScheduledVisit(enrolment, nSV, db));
    }

    saveOrUpdate(programEncounter, nextScheduledVisits) {
        General.logDebug('ProgramEncounterService', `New Program Encounter UUID: ${programEncounter.uuid}`);
        ObservationsHolder.convertObsForSave(programEncounter.observations);
        ObservationsHolder.convertObsForSave(programEncounter.cancelObservations);

        const db = this.db;
        this.db.write(() => {
            this._saveEncounter(programEncounter, db);
            this.saveScheduledVisits(programEncounter.programEnrolment, nextScheduledVisits, db);
        });
        return programEncounter;
    }

    findDueEncounter(encounterTypeUUID, enrolmentUUID) {
        const encounters = this.findAllByCriteria(`encounterType.uuid="${encounterTypeUUID}" AND programEnrolment.uuid="${enrolmentUUID}"`);
        return encounters.find((encounter) => _.isNil(encounter.encounterDateTime));
    }
}

export default ProgramEncounterService;