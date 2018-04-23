import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Program} from "../../../../openchs-models";

@Service("ProgramService")
class ProgramService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    get programsAvailable() {
        return this.findAll(Program.schema.name).length > 0;
    }
}

export default ProgramService;