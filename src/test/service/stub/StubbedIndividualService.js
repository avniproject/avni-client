import _ from "lodash";
import Program from "../../../js/models/Program";

class StubbedIndividualService {
    eligiblePrograms(individualUUID) {
        const program = new Program();
        program.uuid = 'cb26cd38-3c15-4222-8afb-45caff75c12e';
        program.name = 'TB';
        return [program];
    }
}

export default StubbedIndividualService;