class StubbedBaseService {
    constructor(serviceData, capturedData) {
        this.serviceData = serviceData;
        this.capturedData = capturedData;
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

    loadAllNonVoided() {
        return this.serviceData;
    }

    saveOrUpdate(entity, schema) {
        this.serviceData[entity.uuid] = entity;
        return entity;
    }
}

export default StubbedBaseService;
