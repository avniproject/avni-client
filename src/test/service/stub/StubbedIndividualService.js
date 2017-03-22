class StubbedIndividualService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    eligiblePrograms(individualUUID) {
        return this.serviceData.eligiblePrograms;
    }
}

export default StubbedIndividualService;