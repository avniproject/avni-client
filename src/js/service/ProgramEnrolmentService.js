import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import G from "../utility/General";
import ProgramEnrolment from "../models/ProgramEnrolment";
import Individual from "../models/Individual";
import EntityQueue from "../models/EntityQueue";

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    enrol(programEnrolment, individual) {
        const db = this.db;
        programEnrolment.uuid = G.randomUUID();
        programEnrolment.enrolmentDateTime = new Date();
        this.db.write(()=> {
            const loadedIndividual = this.findByUUID(individual.uuid, Individual.schema.name);
            programEnrolment.individual = loadedIndividual;
            loadedIndividual.enrolments.push(programEnrolment);

            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }
}

export default ProgramEnrolmentService;