import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import G from "../utility/General";
import ProgramEnrolment from '../models/ProgramEnrolment';

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    enrol(programEnrolment) {
        programEnrolment.uuid = G.randomUUID();
        programEnrolment.enrolmentDateTime = new Date();
        this.save(programEnrolment);
    }
}

export default ProgramEnrolmentService;