import Service from "../framework/bean/Service";
import BaseService from "./BaseService";

@Service("entityService")
class EntityService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        throw "Should not call getSchema on Entity Service";
    }
}

export default EntityService;