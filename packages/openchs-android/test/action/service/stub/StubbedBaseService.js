class StubbedBaseService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    findByUUID(uuid) {
        return this.serviceData[uuid];
    }

    existsByUuid(uuid) {
        return !!this.serviceData[uuid];
    }

    getAllNonVoided() {
        return this.serviceData;
    }
}

export default StubbedBaseService;
