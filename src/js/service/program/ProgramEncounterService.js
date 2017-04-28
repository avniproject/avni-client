import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import ProgramEncounter from "../../models/ProgramEncounter";
import ProgramEnrolment from "../../models/ProgramEnrolment";
import EncounterType from "../../models/EncounterType";
import moment from "moment";
import EntityQueue from "../../models/EntityQueue";
import ObservationsHolder from '../../models/ObservationsHolder';
import RuleEvaluationService from "../RuleEvaluationService";
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
        const unfulfilledEncounters = this.db.objects(ProgramEncounter.schema.name).filtered(`encounterDateTime == null AND scheduledDateTime != null AND programEnrolment.program.uuid == \"${program.uuid}\"`).sorted('scheduledDateTime');
        encounterSummary.upcoming = 0;
        encounterSummary.overdue = 0;

        unfulfilledEncounters.forEach((programEncounter) => {
            if (moment(programEncounter.scheduledDateTime).subtract(7, 'days').isAfter(moment())) {
                encounterSummary.upcoming++;
            } else if (General.dateAIsAfterB(programEncounter.scheduledDateTime, new Date())) {
                encounterSummary.overdue++;
            }
        });
        encounterSummary.openEncounters = unfulfilledEncounters;
        return encounterSummary;
    }

    saveOrUpdate(programEncounter, nextScheduledVisits) {
        ObservationsHolder.convertObsForSave(programEncounter.observations);

        const programEncounters = [programEncounter];
        const self = this;

        nextScheduledVisits.forEach((nextScheduledVisit) => {
            const encounterType = self.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
            if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for an encounter type=${nextScheduledVisit.encounterType}, but it doesn't exist`);

            const scheduledProgramEncounter = ProgramEncounter.createFromScheduledVisit(nextScheduledVisit, encounterType, programEncounter.programEnrolment);
            programEncounters.push(scheduledProgramEncounter);
        });

        const db = this.db;
        this.db.write(()=> {
            programEncounters.forEach((programEncounter) => db.create(ProgramEncounter.schema.name, programEncounter, true));

            programEncounters.forEach((programEncounter) => {
                const loadedEncounter = this.findByUUID(programEncounter.uuid, ProgramEncounter.schema.name);
                const enrolment = this.findByUUID(programEncounter.programEnrolment.uuid, ProgramEnrolment.schema.name);
                enrolment.addEncounter(loadedEncounter);
                db.create(EntityQueue.schema.name, EntityQueue.create(programEncounter, ProgramEncounter.schema.name));
            });
        });
        return programEncounter;
    }

    findDueEncounter(encounterTypeUUID, enrolmentUUID) {
        return this.findByCriteria(`encounterType.uuid="${encounterTypeUUID}" AND programEnrolment.uuid="${enrolmentUUID}"`);
    }
}

export default ProgramEncounterService;