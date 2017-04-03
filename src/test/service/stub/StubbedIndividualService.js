import StubbedBaseService from "./StubbedBaseService";

class StubbedIndividualService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    eligiblePrograms(individualUUID) {
        return this.serviceData.eligiblePrograms;
    }
}

export default StubbedIndividualService;