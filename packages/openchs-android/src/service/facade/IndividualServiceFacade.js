import IndividualService from "../IndividualService";
import GlobalContext from "../../GlobalContext";

class IndividualServiceFacade {
    constructor() {}

    getSubjectsInLocation(addressLevel, subjectTypeName) {
        return GlobalContext.getInstance().beanRegistry.getService(IndividualService)
            .getSubjectsInLocation(addressLevel, subjectTypeName);
    }
}

const individualServiceFacade = new IndividualServiceFacade();
export default individualServiceFacade;
