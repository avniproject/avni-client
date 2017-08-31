class StubbedBaseService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    findByUUID(uuid) {
        return this.serviceData[uuid];
    }
}

export default StubbedBaseService;