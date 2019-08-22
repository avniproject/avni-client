import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import { BeneficiaryPinModePin } from 'openchs-models'

@Service("BeneficiaryModePinService")
class ProgramService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return BeneficiaryModePin.;
    }

    allPrograms() {
        return this.findAll(Program.schema.name);
    }

    get programsAvailable() {
        return this.allPrograms().length > 0;
    }
}

export default ProgramService;