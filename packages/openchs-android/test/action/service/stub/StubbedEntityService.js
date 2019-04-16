import StubbedBaseService from "./StubbedBaseService";

class StubbedEntityService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    getAll() {
        return [];
    }

    findByKey() {
        return null;
    }
}

export default StubbedEntityService;