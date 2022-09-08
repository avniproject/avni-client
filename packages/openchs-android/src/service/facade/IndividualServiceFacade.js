import IndividualService from "../IndividualService";
import BeanRegistry from "../../framework/bean/BeanRegistry";

class IndividualServiceFacade {
    constructor() {}

    getSubjectsInLocation(addressLevel, subjectTypeName) {
        return BeanRegistry.getService(IndividualService)
            .getSubjectsInLocation(addressLevel, subjectTypeName);
    }
}

const individualServiceFacade = new IndividualServiceFacade();
export default individualServiceFacade;
