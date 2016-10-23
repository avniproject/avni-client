import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";

@Service("referenceDataService")
class ReferenceDataService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    save(schema, referenceData) {
        const db = this.db;
        this.db.write(()=> db.create(schema, referenceData, true));
        return referenceData;
    }
}

export default ReferenceDataService;