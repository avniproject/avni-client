import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import ProgramEnrolment from "../models/ProgramEnrolment";
import Individual from "../models/Individual";
import EntityQueue from "../models/EntityQueue";
import _ from "lodash";
import ProgramEncounterService from "./program/ProgramEncounterService";
import RuleEvaluationService from "./RuleEvaluationService";
import ProgramEncounter from "../models/ProgramEncounter";
import ObservationsHolder from '../models/ObservationsHolder';

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    static convertObsForSave(programEnrolment) {
        ObservationsHolder.convertObsForSave(programEnrolment.observations);
        ObservationsHolder.convertObsForSave(programEnrolment.programExitObservations);
    }

    enrol(programEnrolment) {
        const nextScheduledDate = this.getService(RuleEvaluationService).getNextScheduledDate(programEnrolment);
        if (!_.isNil(nextScheduledDate)) {
            const programEncounter = ProgramEncounter.createSafeInstance();
            programEncounter.scheduledDateTime = nextScheduledDate;
            programEncounter.programEnrolment = programEnrolment;
            programEnrolment.encounters.push(programEncounter);
        }

        const db = this.db;
        this.db.write(()=> {
            db.create(ProgramEnrolment.schema.name, programEnrolment, true);

            const loadedIndividual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);

            if (!_.some(loadedIndividual.enrolments, (enrolment) => enrolment.uuid === programEnrolment.uuid)) {
                const loadedEnrolment = this.findByUUID(programEnrolment.uuid, ProgramEnrolment.schema.name);
                loadedIndividual.enrolments.push(loadedEnrolment);
            }

            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }

    exit(programEnrolment) {
        ProgramEnrolmentService.convertObsForSave(programEnrolment);
        const db = this.db;
        this.db.write(()=> {
            db.create(ProgramEnrolment.schema.name, programEnrolment, true);
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