import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import ProgramEncounter from "../../models/ProgramEncounter";
import ProgramEnrolment from "../../models/ProgramEnrolment";
import moment from "moment";
import EntityQueue from "../../models/EntityQueue";
import ObservationsHolder from '../../models/ObservationsHolder';

@Service("ProgramEncounterService")
class ProgramEncounterService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getProgramSummary(program) {
        const encounterSummary = {};
        const unfulfilledEncounters = this.db.objects(ProgramEncounter.schema.name).filtered(`encounterDateTime == null AND scheduledDateTime != null AND programEnrolment.program.uuid == \"${program.uuid}\"`).sorted('scheduledDateTime');
        encounterSummary.upcoming = 0;
        encounterSummary.overdue = 0;

        unfulfilledEncounters.forEach((programEncounter) => {
            if (moment(programEncounter.scheduledDateTime).subtract(7, 'days').isAfter(moment())) {
                encounterSummary.upcoming++;
            } else if (moment(programEncounter.scheduledDateTime).isAfter(moment())) {
                encounterSummary.overdue++;
            }
        });
        encounterSummary.openEncounters = unfulfilledEncounters;
        return encounterSummary;
    }

    saveOrUpdate(programEncounter) {
        ObservationsHolder.convertObsForSave(programEncounter.observations);
        const db = this.db;
        this.db.write(()=> {
            db.create(ProgramEncounter.schema.name, programEncounter, true);

            const loadedEncounter = this.findByUUID(programEncounter.uuid, ProgramEncounter.schema.name);
            const enrolment = this.findByUUID(programEncounter.programEnrolment.uuid, ProgramEnrolment.schema.name);
            enrolment.addEncounter(loadedEncounter);

            db.create(EntityQueue.schema.name, EntityQueue.create(programEncounter, ProgramEncounter.schema.name));
        });
        return programEncounter;
    }
}

export default ProgramEncounterService;