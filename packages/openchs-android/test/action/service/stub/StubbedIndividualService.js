import StubbedBaseService from "./StubbedBaseService";

class StubbedIndividualService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    eligiblePrograms(individualUUID) {
        return this.serviceData.eligiblePrograms;
    }

    validateAndInjectOtherSubjectForScheduledVisit(individual, nextScheduledVisits) {
        return nextScheduledVisits;
    }
}

export default StubbedIndividualService;