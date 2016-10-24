import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Individual from "../models/Individual";

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    save(individual) {
        const db = this.db;
        db.write(() => db.create(Individual.schema.name, individual));
    }

    search(criteria) {
        return this.db.objects(Individual.schema.name).filtered(criteria.getFilterCriteria());
    }
}

export default IndividualService;