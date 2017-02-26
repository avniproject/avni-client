import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import G from "../utility/General";
import ProgramEnrolment from "../models/ProgramEnrolment";
import Individual from "../models/Individual";
import EntityQueue from "../models/EntityQueue";
import _ from 'lodash';
import ProgramEncounterService from "./program/ProgramEncounterService";

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    enrol(programEnrolment) {
        const db = this.db;
        programEnrolment.uuid = G.randomUUID();
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
}

export default ProgramEnrolmentService;