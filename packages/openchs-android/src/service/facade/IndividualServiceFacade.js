import IndividualService from "../IndividualService";
import GlobalContext from "../../GlobalContext";
import _ from "lodash";

class IndividualServiceFacade {
    constructor() {}

    getSubjectsInLocation(addressLevel, subjectTypeName) {
        return GlobalContext.getInstance().beanRegistry.getService(IndividualService)
            .getSubjectsInLocation(addressLevel, subjectTypeName).map(_.identity);
    }
}

const individualServiceFacade = new IndividualServiceFacade();
export default individualServiceFacade;
