import IndividualService from "../IndividualService";
import GlobalContext from "../../GlobalContext";
import _ from "lodash";

class IndividualServiceFacade {
    constructor() {}

    getSubjectsInLocation(addressLevel, subjectTypeName) {
        return GlobalContext.getInstance().beanRegistry.getService(IndividualService)
            .getSubjectsInLocation(addressLevel, subjectTypeName).map(_.identity);
    }

    getSubjectByUUID(uuid) {
        return GlobalContext.getInstance().beanRegistry.getService(IndividualService)
            .findByUUID(uuid);
    }

    findAllSubjectsWithMobileNumberForType(mobileNumber, subjectTypeUUID) {
        return GlobalContext.getInstance().beanRegistry.getService(IndividualService)
          .findAllWithMobileNumber(mobileNumber, subjectTypeUUID);
    }

    getSubjects(subjectTypeName, realmFilter) {
        const individualService = GlobalContext.getInstance().beanRegistry.getService(IndividualService);
        let subjects = individualService.getAllNonVoided()
            .filtered('subjectType.name = $0', subjectTypeName);

        if (realmFilter) {
            subjects = subjects.filtered(realmFilter);
        }

        return subjects.map(_.identity);
    }
}

const individualServiceFacade = new IndividualServiceFacade();
export default individualServiceFacade;
