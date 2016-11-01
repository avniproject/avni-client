import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Individual from "../models/Individual";

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Individual.schema.name;
    }

    search(criteria) {
        return this.db.objects(Individual.schema.name).filtered(criteria.getFilterCriteria(), criteria.getMinDateOfBirth(), criteria.getMaxDateOfBirth()).slice(0, 100);
    }
}

export default IndividualService;