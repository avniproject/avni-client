import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import ProgramEncounter from "../../models/ProgramEncounter";
import moment from "moment";

@Service("ProgramEncounterService")
class ProgramEncounterService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getProgramSummary(program) {
        const encounterSummary = {};
        const unfulfilledEncounters = this.db.objects(ProgramEncounter.schema.name).filtered(`actualDateTime == null AND scheduledDateTime != null AND programEnrolment.program.uuid == \"${program.uuid}\"`).sorted('scheduledDateTime');
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
}

export default ProgramEncounterService;