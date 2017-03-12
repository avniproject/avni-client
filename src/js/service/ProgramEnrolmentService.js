import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import G from "../utility/General";
import ProgramEnrolment from "../models/ProgramEnrolment";
import Individual from "../models/Individual";
import EntityQueue from "../models/EntityQueue";
import _ from 'lodash';
import ProgramEncounterService from "./program/ProgramEncounterService";
import RuleEvaluationService from "./RuleEvaluationService";
import ProgramEncounter from "../models/ProgramEncounter";

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    enrol(programEnrolment) {
        programEnrolment.convertObsForSave();

        const nextScheduledDate = this.getService(RuleEvaluationService).getNextScheduledDate(programEnrolment);
        if (!_.isNil(nextScheduledDate)) {
            const programEncounter = new ProgramEncounter();
            programEncounter.uuid = G.randomUUID();
            programEncounter.scheduledDateTime = nextScheduledDate;
            programEncounter.programEnrolment = programEnrolment;
            programEnrolment.encounters.push(programEncounter);
        }

        const db = this.db;
        this.db.write(()=> {
            db.create(ProgramEnrolment.schema.name, programEnrolment, true);

            const loadedIndividual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
            const loadedEnrolment = this.findByUUID(programEnrolment.uuid, ProgramEnrolment.schema.name);
            loadedIndividual.enrolments.push(loadedEnrolment);

            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
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
}

export default ProgramEnrolmentService;