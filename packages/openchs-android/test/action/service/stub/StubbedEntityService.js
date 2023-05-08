import StubbedBaseService from "./StubbedBaseService";

class StubbedEntityService extends StubbedBaseService {
    getAll() {
        return [];
    }

    findByKey() {
        return null;
    }
}

export default StubbedEntityService;
